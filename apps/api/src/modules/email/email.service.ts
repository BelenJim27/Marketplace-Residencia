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
  ): Promise<void> {
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
}