import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

interface OAuthProfile {
  provider: string;
  providerUid: string;
  email?: string;
  nombre?: string;
  fotoUrl?: string;
  accesoToken?: string;
  refrescoToken?: string;
  expiraEn?: Date;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private parseGoogleName(fullName: string): { nombre: string; apellidoPaterno: string | null; apellidoMaterno: string | null } {
    const parts = (fullName || 'Usuario').trim().split(/\s+/).filter(Boolean);
    return {
      nombre: parts[0] || 'Usuario',
      apellidoPaterno: parts.length >= 2 ? parts[1] : null,
      apellidoMaterno: parts.length >= 3 ? parts[2] : null,
    };
  }

  async upsertOAuthAccount(profile: OAuthProfile) {
    const existingAccount = await this.prisma.oauth_cuentas.findUnique({
      where: {
        provider_provider_uid: {
          provider: profile.provider,
          provider_uid: profile.providerUid,
        },
      },
      include: { usuarios: true },
    });

    if (existingAccount) {
      if (existingAccount.usuarios?.eliminado_en) {
        throw new UnauthorizedException('La cuenta ha sido eliminada');
      }

      await this.prisma.oauth_cuentas.update({
        where: { id_cuenta: existingAccount.id_cuenta },
        data: {
          acceso_token: profile.accesoToken,
          refresco_token: profile.refrescoToken,
          foto_url: profile.fotoUrl,
          expira_en: profile.expiraEn,
          actualizado_en: new Date(),
        },
      });

      const usuarioActual = existingAccount.usuarios;

      if (usuarioActual && profile.nombre) {
        const parsed = this.parseGoogleName(profile.nombre);
        const nombreSinEspacios = (usuarioActual.nombre || '').trim().split(/\s+/).length > 1;
        const faltaApellidoPaterno = !usuarioActual.apellido_paterno && !!parsed.apellidoPaterno;

        if (nombreSinEspacios || faltaApellidoPaterno) {
          await this.prisma.usuarios.update({
            where: { id_usuario: existingAccount.id_usuario },
            data: {
              nombre: parsed.nombre,
              ...(profile.fotoUrl && !usuarioActual.foto_url ? { foto_url: profile.fotoUrl } : {}),
              ...(!usuarioActual.apellido_paterno && parsed.apellidoPaterno ? { apellido_paterno: parsed.apellidoPaterno } : {}),
              ...(!usuarioActual.apellido_materno && parsed.apellidoMaterno ? { apellido_materno: parsed.apellidoMaterno } : {}),
            },
          });
        } else if (profile.fotoUrl && !usuarioActual.foto_url) {
          await this.prisma.usuarios.update({
            where: { id_usuario: existingAccount.id_usuario },
            data: { foto_url: profile.fotoUrl },
          });
        }
      } else if (profile.fotoUrl && !usuarioActual?.foto_url) {
        await this.prisma.usuarios.update({
          where: { id_usuario: existingAccount.id_usuario },
          data: { foto_url: profile.fotoUrl },
        });
      }

      return existingAccount.id_usuario;
    }

    const existingUserByEmail = profile.email
      ? await this.prisma.usuarios.findUnique({
          where: { email: profile.email },
        })
      : null;

    if (existingUserByEmail) {
      if (profile.nombre) {
        const parsed = this.parseGoogleName(profile.nombre);
        const nombreSinEspacios = (existingUserByEmail.nombre || '').trim().split(/\s+/).length > 1;
        const faltaApellidoPaterno = !existingUserByEmail.apellido_paterno && !!parsed.apellidoPaterno;

        if (nombreSinEspacios || faltaApellidoPaterno) {
          await this.prisma.usuarios.update({
            where: { id_usuario: existingUserByEmail.id_usuario },
            data: {
              nombre: parsed.nombre,
              ...(profile.fotoUrl && !existingUserByEmail.foto_url ? { foto_url: profile.fotoUrl } : {}),
              ...(!existingUserByEmail.apellido_paterno && parsed.apellidoPaterno ? { apellido_paterno: parsed.apellidoPaterno } : {}),
              ...(!existingUserByEmail.apellido_materno && parsed.apellidoMaterno ? { apellido_materno: parsed.apellidoMaterno } : {}),
            },
          });
        } else if (profile.fotoUrl && !existingUserByEmail.foto_url) {
          await this.prisma.usuarios.update({
            where: { id_usuario: existingUserByEmail.id_usuario },
            data: { foto_url: profile.fotoUrl },
          });
        }
      } else if (profile.fotoUrl && !existingUserByEmail.foto_url) {
        await this.prisma.usuarios.update({
          where: { id_usuario: existingUserByEmail.id_usuario },
          data: { foto_url: profile.fotoUrl },
        });
      }

      const newAccount = await this.prisma.oauth_cuentas.create({
        data: {
          id_usuario: existingUserByEmail.id_usuario,
          provider: profile.provider,
          provider_uid: profile.providerUid,
          email: profile.email,
          foto_url: profile.fotoUrl,
          acceso_token: profile.accesoToken,
          refresco_token: profile.refrescoToken,
          expira_en: profile.expiraEn,
        },
      });

      return newAccount.id_usuario;
    }

    const { nombre, apellidoPaterno, apellidoMaterno } = this.parseGoogleName(profile.nombre || 'Usuario');

    const user = await this.prisma.usuarios.create({
      data: {
        nombre,
        email: profile.email || `${profile.providerUid}@${profile.provider}.local`,
        foto_url: profile.fotoUrl,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        idioma_preferido: 'es',
        moneda_preferida: 'MXN',
        usuario_rol: {
          create: {
            id_rol: 1, // Rol cliente
            estado: 'activo',
          },
        },
      },
    });

    if (profile.email) {
      try {
        await this.emailService.sendWelcomeEmail(profile.email, user.nombre);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    await this.prisma.oauth_cuentas.create({
      data: {
        id_usuario: user.id_usuario,
        provider: profile.provider,
        provider_uid: profile.providerUid,
        email: profile.email,
        foto_url: profile.fotoUrl,
        acceso_token: profile.accesoToken,
        refresco_token: profile.refrescoToken,
        expira_en: profile.expiraEn,
      },
    });

    return user.id_usuario;
  }

  async linkOAuthAccount(
    idUsuario: string,
    profile: OAuthProfile,
  ): Promise<{ id_cuenta: bigint }> {
    const existingAccount = await this.prisma.oauth_cuentas.findUnique({
      where: {
        provider_provider_uid: {
          provider: profile.provider,
          provider_uid: profile.providerUid,
        },
      },
    });

    if (existingAccount) {
      if (existingAccount.id_usuario !== idUsuario) {
        throw new ConflictException('Esta cuenta OAuth ya está vinculada a otro usuario');
      }
      return { id_cuenta: existingAccount.id_cuenta };
    }

    return await this.prisma.oauth_cuentas.create({
      data: {
        id_usuario: idUsuario,
        provider: profile.provider,
        provider_uid: profile.providerUid,
        email: profile.email,
        foto_url: profile.fotoUrl,
        acceso_token: profile.accesoToken,
        refresco_token: profile.refrescoToken,
        expira_en: profile.expiraEn,
      },
    });
  }

  async unlinkOAuthAccount(idUsuario: string, provider: string): Promise<void> {
    const result = await this.prisma.oauth_cuentas.deleteMany({
      where: {
        id_usuario: idUsuario,
        provider,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`No se encontró cuenta OAuth de ${provider}`);
    }
  }

  async getUserOAuthAccounts(idUsuario: string) {
    return this.prisma.oauth_cuentas.findMany({
      where: { id_usuario: idUsuario },
      select: {
        provider: true,
        email: true,
        foto_url: true,
      },
    });
  }
}

class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}
