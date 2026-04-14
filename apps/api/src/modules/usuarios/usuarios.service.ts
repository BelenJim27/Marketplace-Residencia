import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, usuarios } from "@prisma/client";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts } from "../shared/serialize";
import {
  AssignUsuarioRolDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
} from "./dto/usuarios.dto";

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.usuarios.findMany({
      where: { eliminado_en: null },
      include: {
        usuario_rol: { include: { roles: true } },
        oauth_cuentas: {
          where: { provider: "google" },
          select: { provider_uid: true },
          take: 1,
        },
      },
      orderBy: { fecha_registro: "desc" },
    });
    return sanitizeUserResponse(serializeBigInts(attachGoogleId(items)));
  }

  async findOne(id_usuario: string) {
    const item = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      include: {
        usuario_rol: { include: { roles: true } },
        oauth_cuentas: {
          where: { provider: "google" },
          select: { provider_uid: true },
          take: 1,
        },
      },
    });
    if (!item || item.eliminado_en)
      throw new NotFoundException("Usuario no encontrado");
    return sanitizeUserResponse(serializeBigInts(attachGoogleId(item)));
  }

  async create(dto: CreateUsuarioDto) {
    await this.ensureEmailAvailable(dto.email);
    if (dto.google_id) await this.ensureGoogleIdAvailable(dto.google_id);

    const data = {
      nombre: dto.nombre.trim(),
      email: dto.email.trim().toLowerCase(),
      password_hash: dto.password ? await hashPassword(dto.password) : null,
      apellido_paterno: dto.apellido_paterno?.trim() ?? null,
      apellido_materno: dto.apellido_materno?.trim() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      foto_url: dto.foto_url?.trim() ?? null,
      idioma_preferido: dto.idioma_preferido?.trim() ?? "es",
      moneda_preferida: dto.moneda_preferida?.trim() ?? "MXN",
    };

    const user = await this.prisma.usuarios.create({ data });

    if (dto.google_id?.trim()) {
      await this.prisma.oauth_cuentas.create({
        data: {
          id_usuario: user.id_usuario,
          provider: "google",
          provider_uid: dto.google_id.trim(),
          email: user.email,
          foto_url: user.foto_url,
        },
      });
    }

    return sanitizeUserResponse(
      serializeBigInts(
        attachGoogleId({
          ...user,
          oauth_cuentas: dto.google_id?.trim()
            ? [{ provider_uid: dto.google_id.trim() }]
            : [],
        }),
      ),
    );
  }

  async update(id_usuario: string, dto: UpdateUsuarioDto) {
    const current = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      include: {
        oauth_cuentas: {
          where: { provider: "google" },
          select: { id_cuenta: true, provider_uid: true },
          take: 1,
        },
      },
    });
    if (!current || current.eliminado_en)
      throw new NotFoundException("Usuario no encontrado");

    if (dto.email && dto.email.trim().toLowerCase() !== current.email) {
      await this.ensureEmailAvailable(dto.email);
    }
    if (
      dto.google_id &&
      dto.google_id.trim() !== (current.oauth_cuentas[0]?.provider_uid ?? "")
    ) {
      await this.ensureGoogleIdAvailable(dto.google_id);
    }

    const user = await this.prisma.usuarios.update({
      where: { id_usuario },
      data: clean({
        nombre: dto.nombre?.trim(),
        email: dto.email?.trim().toLowerCase(),
        password_hash: dto.password
          ? await hashPassword(dto.password)
          : undefined,
        apellido_paterno: dto.apellido_paterno?.trim(),
        apellido_materno: dto.apellido_materno?.trim(),
        telefono: dto.telefono?.trim(),
        foto_url: dto.foto_url?.trim(),
        idioma_preferido: dto.idioma_preferido?.trim(),
        moneda_preferida: dto.moneda_preferida?.trim(),
      }),
    });

    if (dto.google_id !== undefined) {
      const googleId = dto.google_id.trim();
      const googleAccount = current.oauth_cuentas[0];

      if (googleId) {
        if (googleAccount) {
          await this.prisma.oauth_cuentas.update({
            where: { id_cuenta: googleAccount.id_cuenta },
            data: {
              provider_uid: googleId,
              email: user.email,
              foto_url: user.foto_url,
            },
          });
        } else {
          await this.prisma.oauth_cuentas.create({
            data: {
              id_usuario,
              provider: "google",
              provider_uid: googleId,
              email: user.email,
              foto_url: user.foto_url,
            },
          });
        }
      } else if (googleAccount) {
        await this.prisma.oauth_cuentas.delete({
          where: { id_cuenta: googleAccount.id_cuenta },
        });
      }
    }

    return sanitizeUserResponse(
      serializeBigInts(
        attachGoogleId({
          ...user,
          oauth_cuentas:
            dto.google_id !== undefined
              ? dto.google_id.trim()
                ? [{ provider_uid: dto.google_id.trim() }]
                : []
              : current.oauth_cuentas.map((account) => ({
                  provider_uid: account.provider_uid,
                })),
        }),
      ),
    );
  }

  async remove(id_usuario: string) {
    const current = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
    });
    if (!current || current.eliminado_en)
      throw new NotFoundException("Usuario no encontrado");

    const updated = await this.prisma.usuarios.update({
      where: { id_usuario },
      data: {
        eliminado_en: new Date(),
        version_token: { increment: 1 },
      },
    });

    await this.prisma.refresh_tokens.updateMany({
      where: { id_usuario, revocado_en: null },
      data: { revocado_en: new Date() },
    });

    return sanitizeUserResponse(serializeBigInts(updated));
  }

  async addRole(id_usuario: string, id_rol: number) {
    await this.ensureUserExists(id_usuario);
    const relation = await this.prisma.usuario_rol.upsert({
      where: { id_usuario_id_rol: { id_usuario, id_rol } },
      create: { id_usuario, id_rol },
      update: { estado: "activo" },
    });
    return serializeBigInts(relation);
  }

  async removeRole(id_usuario: string, id_rol: number) {
    await this.prisma.usuario_rol.delete({
      where: { id_usuario_id_rol: { id_usuario, id_rol } },
    });
    return { message: "Rol removido del usuario" };
  }

  private async ensureUserExists(id_usuario: string) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.usuarios.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) throw new ConflictException("Email ya registrado");
  }

  private async ensureGoogleIdAvailable(google_id: string) {
    const existing = await this.prisma.oauth_cuentas.findUnique({
      where: {
        provider_provider_uid: {
          provider: "google",
          provider_uid: google_id.trim(),
        },
      },
    });
    if (existing) throw new ConflictException("Google ID ya registrado");
  }
}

function clean<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

function sanitizeUserResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUserResponse(item)) as T;
  }

  if (value && typeof value === "object") {
    const { password_hash, ...rest } = value as Record<string, unknown>;
    return rest as T;
  }

  return value;
}

function attachGoogleId<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => attachGoogleId(item)) as T;
  }

  if (
    value &&
    typeof value === "object" &&
    "oauth_cuentas" in (value as Record<string, unknown>)
  ) {
    const typedValue = value as Record<string, unknown> & {
      oauth_cuentas?: Array<{ provider_uid?: string | null }>;
    };
    const { oauth_cuentas, ...rest } = typedValue;

    return {
      ...rest,
      google_id: oauth_cuentas?.[0]?.provider_uid ?? null,
    } as T;
  }

  return value;
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) return reject(error);
        resolve(
          `scrypt$16384$8$1$${salt}$${Buffer.from(derivedKey).toString("hex")}$sha512`,
        );
      },
    );
  });
}
