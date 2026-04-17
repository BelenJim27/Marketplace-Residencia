import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, usuarios } from '@prisma/client';
import { createHash, createHmac, randomBytes, timingSafeEqual, scrypt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
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

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret';
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'change-me-password-reset-secret';

const ACCESS_TOKEN_EXPIRES_IN = parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60);
const REFRESH_TOKEN_EXPIRES_IN = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60);
const PASSWORD_RESET_EXPIRES_IN = parseDurationToSeconds(process.env.PASSWORD_RESET_EXPIRES_IN, 30 * 60);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.usuarios.create({
        data: {
          nombre: dto.nombre.trim(),
          email,
          password_hash: passwordHash,
          apellido_paterno: dto.apellido_paterno?.trim() || null,
          apellido_materno: dto.apellido_materno?.trim() || null,
          telefono: dto.telefono?.trim() || null,
          foto_url: dto.foto_url?.trim() || null,
          idioma_preferido: dto.idioma_preferido?.trim() || 'es',
          moneda_preferida: dto.moneda_preferida?.trim() || 'MXN',
        },
      });

      // Enviar email de bienvenida
      try {
        await this.emailService.sendWelcomeEmail(user.email, user.nombre);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // No lanzar error si falla el email, el usuario ya está registrado
      }

      await this.logAuthEvent('register', user.id_usuario, { email: user.email });

      return this.issueTokens(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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

    await this.emailService.sendPasswordResetEmail(email, resetToken);

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
    if (!decoded) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario: decoded.sub },
    });

    if (!user || user.eliminado_en) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const accessData = await getAccessData(this.prisma, user.id_usuario);

    const biografia = (user as usuarios & { biografia?: string | null }).biografia ?? null;

    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      email: user.email,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      telefono: user.telefono,
      biografia,
      foto_url: user.foto_url,
      idioma_preferido: user.idioma_preferido,
      moneda_preferida: user.moneda_preferida,
      roles: accessData.roles,
      permisos: accessData.permisos,
      id_productor: accessData.id_productor,
    };
  }

  private async issueTokens(user: usuarios): Promise<AuthResponseDto> {
    const freshUser = await this.prisma.usuarios.findUnique({
      where: { id_usuario: user.id_usuario },
    });

    if (!freshUser || freshUser.eliminado_en) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const accessData = await getAccessData(this.prisma, freshUser.id_usuario);

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

    const biografia = (freshUser as usuarios & { biografia?: string | null }).biografia ?? null;

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
          valor_anterior: metadata as Prisma.InputJsonValue | undefined,
          valor_nuevo: { success: true },
          ip_origen: undefined,
        },
      });
    } catch (error) {
      console.error('Error logging auth event:', error);
    }
  }
}

async function getAccessData(prisma: PrismaService, id_usuario: string): Promise<{ roles: string[]; permisos: string[]; id_productor: number | null }> {
  const user = await prisma.usuarios.findUnique({
    where: { id_usuario },
    include: {
      productores: { select: { id_productor: true } },
      usuario_rol: {
        where: { estado: 'activo' },
        include: {
          roles: {
            include: {
              rol_permiso: { include: { permisos: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  const roles = user.usuario_rol
    .map((relation) => relation.roles?.nombre)
    .filter((role): role is string => Boolean(role));

  const permisos = Array.from(
    new Set(
      user.usuario_rol.flatMap((relation) =>
        relation.roles?.rol_permiso
          .map((permiso) => permiso.permisos?.nombre)
          .filter((permiso): permiso is string => Boolean(permiso)) ?? [],
      ),
    ),
  );

  return {
    roles,
    permisos,
    id_productor: user.productores?.id_productor ?? null,
  };
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
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const data = `${header}.${body}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyJwt<T extends JwtPayload>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedException('Token inválido');
  }

  const [header, body, signature] = parts;
  const expectedSignature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  if (!safeEquals(signature, expectedSignature)) {
    throw new UnauthorizedException('Token inválido');
  }

  let payload: T & { exp?: number };

  try {
    payload = JSON.parse(base64UrlDecode(body)) as T & { exp?: number };
  } catch {
    throw new UnauthorizedException('Token inválido');
  }

  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Token expirado');
  }

  return payload;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
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

  if (unit === 'm') {
    return amount * 60;
  }

  if (unit === 'h') {
    return amount * 60 * 60;
  }

  if (unit === 'd') {
    return amount * 24 * 60 * 60;
  }

  return amount;
}
