import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, usuarios } from '@prisma/client';
import { createHash, createHmac, randomBytes, timingSafeEqual, scrypt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
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

type JwtPayload = Record<string, string | number | boolean | undefined>;

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  version_token: number;
  token_type: 'access';
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
  constructor(private readonly prisma: PrismaService) {}

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
          google_id: dto.google_id?.trim() || null,
          idioma_preferido: dto.idioma_preferido?.trim() || 'es',
          moneda_preferida: dto.moneda_preferida?.trim() || 'MXN',
        },
      });

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

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshAuthDto): Promise<AuthResponseDto> {
    const payload = verifyJwt<RefreshTokenPayload>(dto.refresh_token, REFRESH_TOKEN_SECRET);
    if (payload.token_type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const tokenHash = hashToken(dto.refresh_token);
    const storedToken = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { usuarios: true },
    });

    if (!storedToken || storedToken.revocado_en || storedToken.expira_en <= new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!storedToken.usuarios || storedToken.usuarios.eliminado_en) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (storedToken.usuarios.id_usuario !== payload.sub || storedToken.usuarios.version_token !== payload.version_token) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refresh_tokens.update({
      where: { token_hash: tokenHash },
      data: { revocado_en: new Date() },
    });

    return this.issueTokens(storedToken.usuarios);
  }

  async logout(dto: LogoutAuthDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.refresh_token);
    const storedToken = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!storedToken) {
      return { message: 'Sesión cerrada' };
    }

    if (!storedToken.revocado_en) {
      await this.prisma.refresh_tokens.update({
        where: { token_hash: tokenHash },
        data: { revocado_en: new Date() },
      });
    }

    return { message: 'Sesión cerrada' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto, ipSolicitud?: string): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.usuarios.findUnique({ where: { email } });

    if (!user || user.eliminado_en) {
      return { message: 'Si el usuario existe, recibirá instrucciones para restablecer su contraseña' };
    }

    const rawToken = createSignedJwt(
      {
        sub: user.id_usuario,
        token_type: 'password_reset',
        jti: randomBytes(16).toString('hex'),
      },
      PASSWORD_RESET_SECRET,
      PASSWORD_RESET_EXPIRES_IN,
    );

    await this.prisma.password_reset_tokens.create({
      data: {
        id_usuario: user.id_usuario,
        token_hash: hashToken(rawToken),
        ip_solicitud: ipSolicitud ?? null,
      },
    });

    return { message: 'Si el usuario existe, recibirá instrucciones para restablecer su contraseña' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const payload = verifyJwt<PasswordResetPayload>(dto.reset_token, PASSWORD_RESET_SECRET);

    if (payload.token_type !== 'password_reset') {
      throw new UnauthorizedException('Token de restablecimiento inválido');
    }

    const tokenHash = hashToken(dto.reset_token);
    const resetToken = await this.prisma.password_reset_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { usuarios: true },
    });

    if (!resetToken || resetToken.usado || resetToken.expira_en <= new Date()) {
      throw new UnauthorizedException('Token de restablecimiento inválido');
    }

    if (!resetToken.usuarios || resetToken.usuarios.eliminado_en) {
      throw new UnauthorizedException('Token de restablecimiento inválido');
    }

    if (resetToken.usuarios.id_usuario !== payload.sub) {
      throw new UnauthorizedException('Token de restablecimiento inválido');
    }

    const passwordHash = await hashPassword(dto.new_password);

    await this.prisma.$transaction([
      this.prisma.usuarios.update({
        where: { id_usuario: resetToken.usuarios.id_usuario },
        data: {
          password_hash: passwordHash,
          version_token: { increment: 1 },
        },
      }),
      this.prisma.password_reset_tokens.update({
        where: { token_hash: tokenHash },
        data: { usado: true },
      }),
      this.prisma.refresh_tokens.updateMany({
        where: { id_usuario: resetToken.usuarios.id_usuario, revocado_en: null },
        data: { revocado_en: new Date() },
      }),
    ]);

    return { message: 'Contraseña actualizada correctamente' };
  }

  private async issueTokens(user: usuarios): Promise<AuthResponseDto> {
    const freshUser = await this.prisma.usuarios.findUnique({
      where: { id_usuario: user.id_usuario },
    });

    if (!freshUser || freshUser.eliminado_en) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const accessToken = createSignedJwt<AccessTokenPayload>(
      {
        sub: freshUser.id_usuario,
        email: freshUser.email,
        version_token: freshUser.version_token,
        token_type: 'access',
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

    return {
      user: mapUser(freshUser),
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }
}

function mapUser(user: usuarios): AuthUserDto {
  return {
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    email: user.email,
    apellido_paterno: user.apellido_paterno,
    apellido_materno: user.apellido_materno,
    telefono: user.telefono,
    foto_url: user.foto_url,
    google_id: user.google_id,
    idioma_preferido: user.idioma_preferido,
    moneda_preferida: user.moneda_preferida,
    version_token: user.version_token,
    fecha_registro: user.fecha_registro,
    eliminado_en: user.eliminado_en,
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
