import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Moneda, Prisma } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual, scrypt } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AccessContextService } from './access-context.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import {
  AuthResponseDto,
  AuthUserDto,
  LoginAuthDto,
  LogoutAuthDto,
  RefreshAuthDto,
  RegisterAuthDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';

type UsuarioPayload = Prisma.usuariosGetPayload<Record<string, never>>;

type JwtPayload = Record<string, string | number | boolean | null | undefined | string[]>;

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  version_token: number;
  token_type: 'access';
  roles: string[];
  permisos: string[];
  id_productor: number | null;
}

interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  token_type: 'refresh';
  version_token: number;
  jti: string;
}

interface PasswordResetPayload extends JwtPayload {
  sub: string;
  token_type: 'password_reset';
  jti: string;
}

function requireSecret(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`[auth] Variable de entorno ${name} no configurada. El servidor no puede iniciar sin secretos JWT seguros.`);
  return val;
}

const ACCESS_TOKEN_SECRET = requireSecret('JWT_ACCESS_SECRET');
const REFRESH_TOKEN_SECRET = requireSecret('JWT_REFRESH_SECRET');
const PASSWORD_RESET_SECRET = requireSecret('PASSWORD_RESET_SECRET');

const ACCESS_TOKEN_EXPIRES_IN = parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60);
const REFRESH_TOKEN_EXPIRES_IN = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60);
const PASSWORD_RESET_EXPIRES_IN = parseDurationToSeconds(process.env.PASSWORD_RESET_EXPIRES_IN, 30 * 60);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificaciones: NotificacionesService,
    private readonly accessContext: AccessContextService,
  ) {}

  async register(dto: RegisterAuthDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.usuarios.findUnique({
      where: { email },
      select: { id_usuario: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    try {
      const rolCliente = await this.prisma.roles.findUnique({ where: { nombre: 'cliente' } });
      if (!rolCliente) {
        throw new InternalServerErrorException('Rol "cliente" no encontrado. Ejecuta el seed de roles.');
      }

      const passwordHash = await hashPassword(dto.password);
      const user = await this.prisma.usuarios.create({
        data: {
          nombre_usuario: dto.nombre_usuario.trim(),
          nombre: dto.nombre.trim(),
          email,
          password_hash: passwordHash,
          apellido_paterno: dto.apellido_paterno?.trim() || null,
          apellido_materno: dto.apellido_materno?.trim() || null,
          telefono: dto.telefono?.trim() || null,
          foto_url: dto.foto_url?.trim() || null,
          idioma_preferido: dto.idioma_preferido?.trim() || 'es',
          moneda_preferida: (dto.moneda_preferida?.trim() || 'MXN') as Moneda,
          usuario_rol: {
            create: {
              id_rol: rolCliente.id_rol,
              estado: 'activo',
            },
          },
        },
      });

      try {
        await this.emailService.sendWelcomeEmail(user.email, user.nombre, user.idioma_preferido === 'en' ? 'en' : 'es');
      } catch (emailError) {
        this.logger.warn(`Error sending welcome email: ${(emailError as Error)?.message}`);
      }

      this.notificaciones.notifyUser(
        user.id_usuario,
        'bienvenida',
        `¡Bienvenido, ${user.nombre}!`,
        'Tu cuenta fue creada exitosamente. Explora los mejores mezcales artesanales de Oaxaca.',
        '/',
      ).catch(() => {});

      this.notificaciones.notifyAdmins(
        'nuevo_usuario',
        'Nuevo usuario registrado',
        `${user.nombre} (${user.email}) se ha registrado en la plataforma.`,
        '/Administrador/usuarios',
      ).catch(() => {});

      await this.logAuthEvent('register', user.id_usuario, { email: user.email });

      return this.issueTokens(user);
    } catch (error) {
      this.logger.error(`[AuthService] register error: ${(error as Error)?.message}`);
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('No fue posible registrar el usuario');
      }

      throw new InternalServerErrorException('No fue posible registrar el usuario');
    }
  }

  async login(dto: LoginAuthDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.usuarios.findUnique({
      where: { email },
    });

    if (!user || user.eliminado_en) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('El usuario no tiene contraseña local');
    }

    const valid = await verifyPassword(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.logAuthEvent('login', user.id_usuario, { email: user.email });

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshAuthDto): Promise<AuthResponseDto> {
    if (!dto.refresh_token) throw new UnauthorizedException('Refresh token requerido');
    const payload = verifyJwt<RefreshTokenPayload>(dto.refresh_token, REFRESH_TOKEN_SECRET);

    if (payload.token_type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const tokenHash = hashToken(dto.refresh_token);
    const storedToken = await this.prisma.refresh_tokens.findFirst({
      where: {
        id_usuario: payload.sub,
        token_hash: tokenHash,
        revocado_en: null,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido o ya usado');
    }

    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario: payload.sub },
      // Select explícito: un findUnique sin select pide TODAS las columnas del
      // schema y revienta si alguna (recién añadida) aún no existe en la BD
      // (drift de migración). issueTokens sólo necesita id_usuario; aquí
      // validamos eliminado_en y version_token.
      select: { id_usuario: true, eliminado_en: true, version_token: true },
    });

    if (!user || user.eliminado_en) {
      throw new UnauthorizedException('Usuario no encontrado o eliminado');
    }

    if (user.version_token !== payload.version_token) {
      throw new UnauthorizedException('Token invalidado');
    }

    await this.prisma.refresh_tokens.update({
      where: { id_token: storedToken.id_token },
      data: { revocado_en: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(dto: LogoutAuthDto): Promise<{ message: string }> {
    if (!dto.refresh_token) throw new UnauthorizedException('Refresh token requerido');
    const payload = verifyJwt<RefreshTokenPayload>(dto.refresh_token, REFRESH_TOKEN_SECRET);

    const tokenHash = hashToken(dto.refresh_token);
    await this.prisma.refresh_tokens.updateMany({
      where: {
        id_usuario: payload.sub,
        token_hash: tokenHash,
        revocado_en: null,
      },
      data: { revocado_en: new Date() },
    });

    await this.logAuthEvent('logout', payload.sub, {});

    return { message: 'Logout exitoso' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.usuarios.findUnique({
      where: { email },
    });

    if (!user || user.eliminado_en) {
      return { message: 'Si el email existe, se enviará un enlace de recuperación' };
    }

    const resetToken = createSignedJwt<PasswordResetPayload>(
      {
        sub: user.id_usuario,
        token_type: 'password_reset',
        jti: randomBytes(16).toString('hex'),
      },
      PASSWORD_RESET_SECRET,
      PASSWORD_RESET_EXPIRES_IN,
    );

    await this.emailService.sendPasswordResetEmail(
      email,
      resetToken,
      user.idioma_preferido === 'en' ? 'en' : 'es',
    );

    await this.logAuthEvent('password_reset_request', user.id_usuario, { email: user.email });

    return { message: 'Si el email existe, se enviará un enlace de recuperación' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const payload = verifyJwt<PasswordResetPayload>(dto.token, PASSWORD_RESET_SECRET);

    if (payload.token_type !== 'password_reset') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario: payload.sub },
    });

    if (!user || user.eliminado_en) {
      throw new UnauthorizedException('Usuario no encontrado o eliminado');
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: {
        password_hash: passwordHash,
        version_token: { increment: 1 },
      },
    });

    await this.prisma.refresh_tokens.updateMany({
      where: { id_usuario: user.id_usuario },
      data: { revocado_en: new Date() },
    });

    await this.logAuthEvent('password_reset_complete', user.id_usuario, {});

    return { message: 'Password actualizado exitosamente' };
  }

  async loginWithOAuth(idUsuario: string): Promise<AuthResponseDto> {
    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario: idUsuario },
    });

    if (!user || user.eliminado_en) {
      throw new UnauthorizedException('Usuario no encontrado o eliminado');
    }

    await this.logAuthEvent('oauth_login', user.id_usuario, { email: user.email });

    return this.issueTokens(user);
  }

  async getMe(token: string) {
    const decoded = verifyJwt<AccessTokenPayload>(token, ACCESS_TOKEN_SECRET);
    const context = await this.accessContext.getForUser(decoded.sub);
    if (!context || context.version_token !== decoded.version_token) {
      throw new UnauthorizedException('Sesión invalidada. Inicia sesión nuevamente.');
    }
    return {
      id_usuario: context.id_usuario,
      email: context.email,
      roles: context.roles,
      permisos: context.permisos,
      id_productor: context.id_productor,
    };
  }

  // ✅ Usa UsuarioPayload en lugar de usuarios importado directamente
  private async issueTokens(user: Pick<UsuarioPayload, 'id_usuario'>): Promise<AuthResponseDto> {
    const freshUser = await this.prisma.usuarios.findUnique({
      where: { id_usuario: user.id_usuario },
      // Select explícito de los campos que arma la respuesta: sin select Prisma
      // pide todas las columnas del schema y rompe si una (recién añadida) aún
      // no existe en la BD.
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        apellido_paterno: true,
        apellido_materno: true,
        telefono: true,
        foto_url: true,
        idioma_preferido: true,
        moneda_preferida: true,
        version_token: true,
        fecha_registro: true,
        eliminado_en: true,
      },
    });

    if (!freshUser || freshUser.eliminado_en) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const accessData = await this.accessContext.requireForUser(freshUser.id_usuario);

    const accessToken = createSignedJwt<AccessTokenPayload>(
      {
        sub: freshUser.id_usuario,
        email: freshUser.email,
        version_token: freshUser.version_token,
        token_type: 'access',
        roles: accessData.roles,
        permisos: accessData.permisos,
        id_productor: accessData.id_productor,
      },
      ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRES_IN,
    );

    const refreshToken = createSignedJwt<RefreshTokenPayload>(
      {
        sub: freshUser.id_usuario,
        version_token: freshUser.version_token,
        token_type: 'refresh',
        jti: randomBytes(16).toString('hex'),
      },
      REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRES_IN,
    );

    await this.prisma.refresh_tokens.create({
      data: {
        id_usuario: freshUser.id_usuario,
        token_hash: hashToken(refreshToken),
      },
    });

    // biografia no es columna de usuarios (vive en productores); se mantiene null.
    const biografia: string | null = null;

    return {
      user: {
        id_usuario: freshUser.id_usuario,
        nombre: freshUser.nombre,
        email: freshUser.email,
        apellido_paterno: freshUser.apellido_paterno,
        apellido_materno: freshUser.apellido_materno,
        telefono: freshUser.telefono,
        biografia,
        foto_url: freshUser.foto_url,
        idioma_preferido: freshUser.idioma_preferido,
        moneda_preferida: freshUser.moneda_preferida,
        version_token: freshUser.version_token,
        fecha_registro: freshUser.fecha_registro,
        eliminado_en: freshUser.eliminado_en,
        roles: accessData.roles,
        permisos: accessData.permisos,
        id_productor: accessData.id_productor,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }

  private async logAuthEvent(action: string, idUsuario?: string, metadata?: Record<string, unknown>) {
    try {
      await this.prisma.auditoria.create({
        data: {
          id_usuario: idUsuario || undefined,
          accion: `auth.${action}`,
          tabla_afectada: 'usuarios',
          registro_id: idUsuario || undefined,
          valor_anterior: metadata as any,
          valor_nuevo: { success: true },
          ip_origen: undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Error logging auth event: ${(error as Error)?.message}`);
    }
  }
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const iterations = 16384;
  const keyLength = 64;

  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: iterations, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (error: Error | null, derivedKey: Buffer) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`scrypt$${iterations}$8$1$${salt}$${derivedKey.toString('hex')}$sha512`);
    });
  });
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
    return bcrypt.compare(password, storedHash);
  }

  const parts = storedHash.split('$');
  if (parts.length !== 7 || parts[0] !== 'scrypt') {
    return Promise.resolve(false);
  }

  const iterations = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const hashHex = parts[5];
  const keyLength = Buffer.from(hashHex, 'hex').length;

  return new Promise((resolve) => {
    scrypt(password, salt, keyLength, { N: iterations, r, p, maxmem: 128 * 1024 * 1024 }, (error: Error | null, derivedKey: Buffer) => {
      if (error) {
        resolve(false);
        return;
      }

      const expected = Buffer.from(hashHex, 'hex');
      resolve(expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey));
    });
  });
}

function createSignedJwt<T extends JwtPayload>(payload: T, secret: string, expiresInSeconds: number): string {
  return jwt.sign(payload as object, secret, { expiresIn: expiresInSeconds, algorithm: 'HS256' });
}

export function verifyJwt<T extends JwtPayload>(token: string, secret: string): T {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as T;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedException('Token expirado');
    }
    throw new UnauthorizedException('Token inválido');
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseDurationToSeconds(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const match = value.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? 's';

  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 60 * 60;
  if (unit === 'd') return amount * 24 * 60 * 60;

  return amount;
}
