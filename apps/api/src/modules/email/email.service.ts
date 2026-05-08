import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private isProduction: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@marketplace.com';
    this.isProduction = process.env.NODE_ENV === 'production';

    if (!this.apiKey) {
      console.warn('⚠️  SENDGRID_API_KEY no configurado. Los emails serán simulados.');
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>¡Bienvenido a Marketplace!</h2>
            <p>Hola ${name},</p>
            <p>Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte en nuestra plataforma.</p>
            <p>Aquí puedes:</p>
            <ul>
              <li>Explorar productos de múltiples productores</li>
              <li>Realizar compras seguras</li>
              <li>Rastrear tus órdenes</li>
            </ul>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '¡Bienvenido a Marketplace!',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>Recuperar contraseña</h2>
            <p>Has solicitado recuperar tu contraseña. Haz clic en el botón abajo para crear una nueva:</p>
            <a href="${resetUrl}" class="button">Restablecer contraseña</a>
            <p>Este enlace caduca en 30 minutos.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Marketplace</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Recuperar tu contraseña',
      html,
    });
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderNumber: string,
    totalAmount: number,
    options?: { incluyeAlcohol?: boolean },
  ): Promise<void> {
    const incluyeAlcohol = !!options?.incluyeAlcohol;

    // Surgeon General Warning — required (27 CFR 16.21) for any order containing alcohol.
    // Inserted only when at least one item belongs to a regulated category, so non-alcohol
    // orders aren't burdened with the warning.
    const alcoholBlock = incluyeAlcohol
      ? `
            <div style="margin: 20px 0; padding: 15px; border: 2px solid #b45309; background: #fffbeb; border-radius: 6px; color: #78350f; font-size: 12px; line-height: 1.5;">
              <strong style="display:block; text-transform:uppercase; margin-bottom:6px;">Government Warning</strong>
              <strong>(1)</strong> According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.
              <br />
              <strong>(2)</strong> Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.
              <br /><br />
              <a href="${process.env.FRONTEND_URL}/alcohol-disclaimer" style="color:#78350f; text-decoration:underline;">Más información</a>
            </div>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .button { display: inline-block; background: #27ae60; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
          .highlight { background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2>¡Orden confirmada!</h2>
            <p>Tu orden ha sido recibida exitosamente.</p>
            <div class="highlight">
              <p><strong>Número de orden:</strong> ${orderNumber}</p>
              <p><strong>Monto total:</strong> $${totalAmount.toFixed(2)}</p>
            </div>
            <p>Recibirás actualizaciones sobre el estado de tu envío pronto.</p>
            <a href="${process.env.FRONTEND_URL}/pedidos" class="button">Ver mis órdenes</a>
            ${alcoholBlock}
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Tu orden ${orderNumber} ha sido confirmada`,
      html,
    });
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.apiKey) {
      console.log('📧 [Email] Modo simulado (sin SENDGRID_API_KEY):');
      console.log(`   Para: ${options.to}`);
      console.log(`   Asunto: ${options.subject}`);
      console.log(`   HTML: ${options.html.substring(0, 100)}...`);
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
            },
          ],
          from: {
            email: this.fromEmail,
          },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        const errorData = JSON.parse(error);
        throw new BadRequestException(
          `SendGrid Error: ${errorData.errors?.[0]?.message || error}`,
        );
      }

      console.log(`✅ Email sent to ${options.to} (${options.subject})`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  async sendSolicitudRecibidaEmail(email: string, nombre: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .badge { display: inline-block; background: #fef9c3; color: #854d0e; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <span class="badge">En revisión</span>
            <h2>Solicitud recibida, ${nombre}</h2>
            <p>Hemos recibido tu solicitud para convertirte en productor. Nuestro equipo la revisará en los próximos días hábiles.</p>
            <p>Te notificaremos por este medio cuando tengamos una respuesta.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace · <a href="${frontendUrl}">Ir a la plataforma</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Recibimos tu solicitud de productor',
      html,
    });
  }

  async sendProductorApprovedEmail(email: string, nombre: string, motivo?: string | null): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <span class="badge">✓ Aprobada</span>
            <h2>¡Felicidades, ${nombre}!</h2>
            <p>Tu solicitud para convertirte en productor ha sido <strong>aprobada</strong>.</p>
            <p>Ahora puedes:</p>
            <ul>
              <li>Publicar tus productos en la plataforma</li>
              <li>Gestionar tu tienda</li>
              <li>Recibir pedidos de clientes</li>
            </ul>
            ${motivo ? `<p><strong>Nota del administrador:</strong> ${motivo}</p>` : ''}
            <a href="${frontendUrl}/dashboard/productor" class="button">Ir a mi dashboard</a>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '¡Tu solicitud de productor fue aprobada!',
      html,
    });
  }

  async sendProductorRejectedEmail(email: string, nombre: string, motivo?: string | null): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
          .motivo { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <span class="badge">Rechazada</span>
            <h2>Hola ${nombre},</h2>
            <p>Lamentamos informarte que tu solicitud para convertirte en productor no fue aprobada en esta ocasión.</p>
            ${motivo ? `<div class="motivo"><strong>Motivo:</strong> ${motivo}</div>` : ''}
            <p>Puedes corregir la información y volver a intentarlo desde la plataforma.</p>
            <a href="${frontendUrl}/Productor/solicitar" class="button">Intentar de nuevo</a>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Actualización sobre tu solicitud de productor',
      html,
    });
  }
}