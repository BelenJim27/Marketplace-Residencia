import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly prisma: PrismaService) {}

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
            <p>Has solicitado recuperar tu contraseña. Haz clic en el botón abaixo para crear una nueva:</p>
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

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@marketplace.com';

    if (!apiKey) {
      console.log('📧 [Email] SENDGRID_API_KEY no configurado. Email simulado:');
      console.log(`   Para: ${options.to}`);
      console.log(`   Asunto: ${options.subject}`);
      console.log(`   Preview URL: ${options.html.substring(0, 200)}...`);
      return;
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: fromEmail },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}