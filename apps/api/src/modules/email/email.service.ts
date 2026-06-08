import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { FacturaPdfService } from './factura-pdf.service';

function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; type: string }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiKey: string;
  private fromEmail: string;
  private isProduction: boolean;
  private gmailTransport: nodemailer.Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly facturaPdfService: FacturaPdfService,
  ) {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@marketplace.com';
    this.isProduction = process.env.NODE_ENV === 'production';

    const gmailUser = process.env.GMAIL_USER || '';
    const gmailPass = process.env.GMAIL_APP_PASSWORD || '';

    if (gmailUser && gmailPass) {
      this.gmailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      this.logger.log(`Gmail SMTP configurado (${gmailUser})`);
    } else if (!this.apiKey) {
      this.logger.warn('Sin GMAIL_APP_PASSWORD ni SENDGRID_API_KEY. Los emails serán simulados.');
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
    options?: {
      incluyeAlcohol?: boolean;
      items?: { nombre: string; cantidad: number; precio_unitario: number; moneda: string }[];
      subtotal?: number;
      shipping?: number;
      tax?: number;
      moneda?: string;
      nombreCliente?: string;
      fecha?: string;
      metodoPago?: string;
      lang?: 'es' | 'en';
    },
  ): Promise<void> {
    const incluyeAlcohol = !!options?.incluyeAlcohol;
    const moneda = options?.moneda ?? 'MXN';
    const nombreCliente = options?.nombreCliente ?? 'Cliente';
    const metodoPago = options?.metodoPago ?? 'Tarjeta de crédito/débito';
    const fechaISO = options?.fecha ?? new Date().toISOString();
    const fechaFormateada = new Date(fechaISO).toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Mexico_City',
    });

    const subtotal = options?.subtotal ?? totalAmount;
    const shipping = options?.shipping ?? 0;
    const tax = options?.tax ?? 0;

    // Calcular IVA por ítem (16% incluido en precio)
    const itemsRows = (options?.items ?? []).map((item) => {
      const importe = Number(item.precio_unitario) * item.cantidad;
      const base = importe / 1.16;
      const iva = importe - base;
      return `
        <tr>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:center; font-size:12px; color:#333;">${item.cantidad}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; font-size:12px; color:#333;">${item.nombre}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:right; font-size:12px; color:#333;">$${Number(item.precio_unitario).toFixed(2)}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:right; font-size:12px; font-weight:600; color:#1a1a1a;">$${importe.toFixed(2)}</td>
        </tr>
        <tr bgcolor="#fafaf8">
          <td colspan="2" style="padding:4px 6px 8px 16px; border:1px solid #ddd; font-size:11px; color:#777;">
            <strong>IMPUESTOS:</strong>&nbsp;&nbsp;Base: $${base.toFixed(2)}&nbsp;&nbsp;|&nbsp;&nbsp;IVA 16%: $${iva.toFixed(2)}
          </td>
          <td style="padding:4px 6px 8px; border:1px solid #ddd; font-size:11px; color:#777; text-align:right;">Tasa 0.160000</td>
          <td style="padding:4px 6px 8px; border:1px solid #ddd; font-size:11px; color:#777; text-align:right;">$${iva.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const alcoholBlock = incluyeAlcohol
      ? `<tr><td colspan="2" style="padding:12px 16px; background:#fffbeb; border-top:2px solid #b45309;">
          <p style="margin:0 0 6px; font-size:11px; color:#78350f; font-weight:bold; text-transform:uppercase;">Government Warning</p>
          <p style="margin:0; font-size:11px; color:#78350f; line-height:1.5;">
            <strong>(1)</strong> According to the Surgeon General, women should not drink alcoholic beverages during pregnancy.<br>
            <strong>(2)</strong> Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery.
          </p>
        </td></tr>`
      : '';

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Compra #${orderNumber}</title>
</head>
<body style="margin:0; padding:0; background-color:#f0ece0; font-family:Arial, Helvetica, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:20px 10px;">

    <!-- Documento principal -->
    <table width="620" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #c8bfa8; max-width:620px;">

      <!-- Barra superior degradada -->
      <tr>
        <td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33); font-size:1px; line-height:1px;">&nbsp;</td>
      </tr>

      <!-- ===== ENCABEZADO: Emisor | Comprobante ===== -->
      <tr>
        <td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Izquierda: Datos del emisor -->
              <td width="58%" valign="top" style="padding:16px 14px 16px 16px; border-right:1px solid #c8bfa8;">
                <!-- Logo texto -->
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#2E4A33; color:#F4F0E3; font-size:22px; font-weight:bold; padding:6px 12px; border-radius:4px; letter-spacing:2px;">
                      &#127807; MEZCAL
                    </td>
                  </tr>
                </table>
                <p style="margin:10px 0 2px; font-size:13px; font-weight:bold; color:#1a1a1a;">Marketplace de Mezcal Oaxaqueño</p>
                <p style="margin:0 0 2px; font-size:11px; color:#555;">Oaxaca de Juárez, Oaxaca, México</p>
                <p style="margin:0 0 2px; font-size:11px; color:#555;">RFC: MME000000AA0</p>
                <p style="margin:0; font-size:11px; color:#555;">Régimen Fiscal: 601 - General de Ley Personas Morales</p>
              </td>
              <!-- Derecha: Caja de comprobante -->
              <td width="42%" valign="top" style="padding:16px 16px 16px 14px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#2E4A33;">
                  <tr>
                    <td colspan="2" bgcolor="#2E4A33" style="padding:7px 10px; text-align:center;">
                      <span style="color:#F4F0E3; font-size:13px; font-weight:bold; letter-spacing:1px;">COMPROBANTE DE COMPRA</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 8px; border-top:1px solid #2E4A33; border-bottom:1px solid #c8bfa8;">
                      <span style="font-size:10px; color:#C97A3E; font-weight:bold; display:block;">Número de Pedido</span>
                      <span style="font-size:13px; font-weight:bold; color:#1a1a1a;">#${orderNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 8px; border-bottom:1px solid #c8bfa8;">
                      <span style="font-size:10px; color:#C97A3E; font-weight:bold; display:block;">Fecha de Compra</span>
                      <span style="font-size:12px; color:#333;">${fechaFormateada}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 8px;">
                      <span style="font-size:10px; color:#C97A3E; font-weight:bold; display:block;">Estado</span>
                      <span style="font-size:12px; color:#16a34a; font-weight:bold;">&#10003; PAGADO</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ===== RECEPTOR: Datos del comprador | Folio ===== -->
      <tr>
        <td style="padding:0; border-top:1px solid #c8bfa8; border-bottom:1px solid #c8bfa8;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Izquierda: Comprador -->
              <td width="58%" valign="top" style="padding:12px 14px 12px 16px; border-right:1px solid #c8bfa8;">
                <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#2E4A33;">
                  <tr>
                    <td bgcolor="#2E4A33" style="padding:5px 8px;">
                      <span style="color:#F4F0E3; font-size:11px; font-weight:bold;">COMPRADOR</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px; font-size:12px; color:#333;">
                      <strong style="font-size:13px; color:#1a1a1a;">${nombreCliente}</strong><br>
                      <span style="color:#555;">Correo: ${email}</span><br>
                      <span style="color:#555;">RFC: XAXX010101000</span><br>
                      <span style="color:#555;">Uso CFDI: S01 - Sin efectos fiscales</span><br>
                      <span style="color:#555;">Régimen Fiscal: 616 - Sin obligaciones fiscales</span>
                    </td>
                  </tr>
                </table>
              </td>
              <!-- Derecha: Folio fiscal -->
              <td width="42%" valign="top" style="padding:12px 16px 12px 14px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#2E4A33;">
                  <tr>
                    <td bgcolor="#2E4A33" style="padding:5px 8px;">
                      <span style="color:#C97A3E; font-size:11px; font-weight:bold;">FOLIO DE COMPRA</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px; font-size:11px; color:#333; word-break:break-all;">
                      ${orderNumber.toString().padStart(10, '0')}
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#2E4A33" style="padding:5px 8px;">
                      <span style="color:#C97A3E; font-size:11px; font-weight:bold;">REFERENCIA</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px; font-size:11px; color:#333;">
                      COMPRA EN LÍNEA
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ===== TABLA DE PRODUCTOS ===== -->
      ${options?.items?.length ? `
      <tr>
        <td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#ddd; font-size:12px;">
            <tr bgcolor="#f7f3ec">
              <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:center; color:#2E4A33; width:40px;">Cant.</th>
              <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:left; color:#2E4A33;">Descripción</th>
              <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:right; color:#2E4A33; width:90px;">Precio Unit.</th>
              <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:right; color:#2E4A33; width:90px;">Importe</th>
            </tr>
            ${itemsRows}
          </table>
        </td>
      </tr>` : ''}

      <!-- ===== PIE: Datos de pago | Importes totales ===== -->
      <tr>
        <td style="padding:0; border-top:1px solid #c8bfa8;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Izquierda: info de pago -->
              <td width="52%" valign="top" style="padding:14px 14px 14px 16px; border-right:1px solid #c8bfa8; font-size:12px; color:#444;">
                <p style="margin:0 0 4px;"><strong>Forma de pago:</strong> ${metodoPago}</p>
                <p style="margin:0 0 4px;"><strong>Método de pago:</strong> PUE - Pago en una sola exhibición</p>
                <p style="margin:0 0 4px;"><strong>Moneda:</strong> ${moneda}</p>
                <p style="margin:0 0 4px;"><strong>Lugar de expedición:</strong> Oaxaca, México</p>
                <p style="margin:0;"><strong>Tipo de Comprobante:</strong> Ticket de compra</p>
              </td>
              <!-- Derecha: Importes totales -->
              <td width="48%" valign="top" style="padding:14px 16px 14px 14px;">
                <p style="margin:0 0 8px; font-size:11px; font-weight:bold; color:#2E4A33; text-transform:uppercase; letter-spacing:0.5px;">IMPORTES TOTALES</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;">
                  <tr>
                    <td style="padding:3px 0; color:#555;">Subtotal</td>
                    <td style="padding:3px 0; text-align:right; color:#333;">$${subtotal.toFixed(2)}</td>
                  </tr>
                  ${shipping > 0 ? `<tr>
                    <td style="padding:3px 0; color:#555;">Envío</td>
                    <td style="padding:3px 0; text-align:right; color:#333;">$${shipping.toFixed(2)}</td>
                  </tr>` : ''}
                  ${tax > 0 ? `<tr>
                    <td style="padding:3px 0; color:#555;">002 - IVA</td>
                    <td style="padding:3px 0; text-align:right; color:#333;">$${tax.toFixed(2)}</td>
                  </tr>` : ''}
                  <tr style="border-top:2px solid #C97A3E;">
                    <td style="padding:6px 0 2px; font-weight:bold; font-size:14px; color:#2E4A33;">Total</td>
                    <td style="padding:6px 0 2px; text-align:right; font-weight:bold; font-size:15px; color:#C97A3E;">$${totalAmount.toFixed(2)}&nbsp;${moneda}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${alcoholBlock}
          </table>
        </td>
      </tr>

      <!-- ===== NOTA DE FACTURA ===== -->
      <tr>
        <td bgcolor="#f7f3ec" style="padding:12px 16px; border-top:1px solid #c8bfa8;">
          <p style="margin:0; font-size:11px; color:#555; text-align:center;">
            &#9432;&nbsp; Este documento es un comprobante de compra.
            Si solicitaste factura (CFDI), la recibirás en un plazo de 24 a 48 horas hábiles en tu correo.
          </p>
        </td>
      </tr>

      <!-- ===== BOTÓN VER PEDIDO ===== -->
      <tr>
        <td style="padding:20px 16px; text-align:center; border-top:1px solid #c8bfa8;">
          <a href="${frontendUrl}/tienda/compras"
             style="display:inline-block; background:#2E4A33; color:#ffffff; text-decoration:none; padding:11px 28px; border-radius:6px; font-size:13px; font-weight:bold; letter-spacing:0.3px;">
            Ver mis compras
          </a>
        </td>
      </tr>

      <!-- ===== PIE DE PÁGINA ===== -->
      <tr>
        <td bgcolor="#2E4A33" style="padding:10px 16px;">
          <p style="margin:0; font-size:11px; color:#a8c4a2; text-align:center;">
            ESTE DOCUMENTO ES UN COMPROBANTE DE COMPRA EN LÍNEA
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 16px 12px; border-top:1px solid #c8bfa8;">
          <p style="margin:0; font-size:10px; color:#aaa; text-align:center;">
            © ${new Date().getFullYear()} Marketplace de Mezcal · Oaxaca, México &nbsp;|&nbsp; Página 1 de 1
          </p>
        </td>
      </tr>

    </table>
    <!-- /Documento principal -->

  </td></tr>
</table>

</body>
</html>`;

    await this.sendEmail({
      to: email,
      subject: `Comprobante de compra #${orderNumber} - Marketplace de Mezcal`,
      html,
    });
  }

  async testEmail(to: string): Promise<{ ok: boolean; transporte: string; destino: string; mensaje: string }> {
    if (!to) return { ok: false, transporte: 'ninguno', destino: '', mensaje: 'Falta el parámetro ?to=' };
    const transporte = this.gmailTransport ? 'Gmail SMTP' : this.apiKey ? 'SendGrid' : 'simulado';
    try {
      await this.sendEmail({
        to,
        subject: 'Test de correo - Marketplace',
        html: '<p>Si ves este mensaje, el correo funciona correctamente. ✅</p>',
      });
      return { ok: true, transporte, destino: to, mensaje: `Correo enviado correctamente a ${to}` };
    } catch (err: any) {
      return { ok: false, transporte, destino: to, mensaje: err?.message ?? String(err) };
    }
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    // Prioridad 1: Gmail SMTP (más confiable para desarrollo)
    if (this.gmailTransport) {
      await this.gmailTransport.sendMail({
        from: `"Marketplace de Mezcal" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.type,
        })),
      });
      this.logger.log(`[Gmail] Email enviado a ${redactEmail(options.to)} — "${options.subject}"`);
      return;
    }

    // Prioridad 2: SendGrid
    if (this.apiKey) {
      try {
        const sgAttachments = options.attachments?.map(a => ({
          content: a.content.toString('base64'),
          filename: a.filename,
          type: a.type,
          disposition: 'attachment',
        }));

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: options.to }] }],
            from: { email: this.fromEmail },
            subject: options.subject,
            content: [{ type: 'text/html', value: options.html }],
            ...(sgAttachments?.length ? { attachments: sgAttachments } : {}),
          }),
        });

        if (!response.ok) {
          const rawError = await response.text();
          let message = rawError;
          try {
            const parsed = JSON.parse(rawError);
            message = parsed.errors?.[0]?.message || rawError;
          } catch { /* response was not JSON */ }
          this.logger.error(`SendGrid HTTP ${response.status}: ${message}`);
          throw new BadRequestException(`SendGrid Error (${response.status}): ${message}`);
        }

        this.logger.log(`[SendGrid] Email enviado a ${redactEmail(options.to)} — "${options.subject}"`);
        return;
      } catch (error: any) {
        this.logger.error(`Error sending email via SendGrid: ${error?.message ?? error}`);
        throw error;
      }
    }

    // Sin configuración: modo simulado
    this.logger.debug(`[Email] Modo simulado — Para: ${redactEmail(options.to)} — Asunto: "${options.subject}"`);
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
    const year = new Date().getFullYear();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/Mexico_City',
    });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Solicitud de productor aprobada!</title>
</head>
<body style="margin:0; padding:0; background-color:#f0ece0; font-family:Arial, Helvetica, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:28px 10px;">

    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #c8bfa8; max-width:600px;">

      <!-- Barra superior degradada -->
      <tr>
        <td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33); font-size:1px; line-height:1px;">&nbsp;</td>
      </tr>

      <!-- Encabezado -->
      <tr>
        <td style="padding:32px 36px 24px; border-bottom:1px solid #e8e0d0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 4px; font-size:11px; font-weight:bold; color:#C97A3E; text-transform:uppercase; letter-spacing:1.5px;">Marketplace de Mezcal · Oaxaca</p>
                <h1 style="margin:0; font-size:26px; font-weight:bold; color:#2E4A33; line-height:1.2;">¡Bienvenido al equipo,<br>${nombre}!</h1>
              </td>
              <td align="right" valign="top">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#dcfce7; border:1px solid #bbf7d0; border-radius:20px; padding:6px 14px;">
                      <span style="color:#166534; font-size:13px; font-weight:bold;">&#10003;&nbsp; Aprobado</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Mensaje principal -->
      <tr>
        <td style="padding:28px 36px 20px;">
          <p style="margin:0 0 16px; font-size:15px; color:#333; line-height:1.7;">
            Nos complace informarte que tu solicitud para convertirte en <strong>productor certificado</strong> en nuestra plataforma ha sido <strong style="color:#2E4A33;">aprobada</strong> el <strong>${fecha}</strong>.
          </p>
          <p style="margin:0 0 24px; font-size:14px; color:#555; line-height:1.7;">
            A partir de ahora puedes comenzar a publicar tus productos y gestionar tu tienda. ¡Es momento de compartir tu mezcal con el mundo!
          </p>
        </td>
      </tr>

      <!-- Tarjeta de pasos -->
      <tr>
        <td style="padding:0 36px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f3ec; border-radius:8px; border:1px solid #e8e0d0;">
            <tr>
              <td style="padding:18px 20px 10px;">
                <p style="margin:0 0 14px; font-size:11px; font-weight:bold; color:#C97A3E; text-transform:uppercase; letter-spacing:1px;">Próximos pasos</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 6px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" width="28" style="padding-bottom:12px;">
                      <span style="display:inline-block; width:22px; height:22px; background:#2E4A33; border-radius:50%; text-align:center; line-height:22px; color:#fff; font-size:11px; font-weight:bold;">1</span>
                    </td>
                    <td style="padding-bottom:12px; padding-left:10px;">
                      <p style="margin:0; font-size:13px; color:#333; line-height:1.5;"><strong>Configura tu tienda</strong> — Agrega tu logo, descripción y datos de contacto.</p>
                    </td>
                  </tr>
                  <tr>
                    <td valign="top" width="28" style="padding-bottom:12px;">
                      <span style="display:inline-block; width:22px; height:22px; background:#2E4A33; border-radius:50%; text-align:center; line-height:22px; color:#fff; font-size:11px; font-weight:bold;">2</span>
                    </td>
                    <td style="padding-bottom:12px; padding-left:10px;">
                      <p style="margin:0; font-size:13px; color:#333; line-height:1.5;"><strong>Publica tus productos</strong> — Agrega fotos, precios e inventario de tu mezcal.</p>
                    </td>
                  </tr>
                  <tr>
                    <td valign="top" width="28" style="padding-bottom:16px;">
                      <span style="display:inline-block; width:22px; height:22px; background:#2E4A33; border-radius:50%; text-align:center; line-height:22px; color:#fff; font-size:11px; font-weight:bold;">3</span>
                    </td>
                    <td style="padding-bottom:16px; padding-left:10px;">
                      <p style="margin:0; font-size:13px; color:#333; line-height:1.5;"><strong>Empieza a vender</strong> — Recibe y gestiona pedidos desde tu panel de productor.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${motivo ? `
      <!-- Nota del administrador -->
      <tr>
        <td style="padding:0 36px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #C97A3E; background:#fffbf5;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0 0 4px; font-size:11px; font-weight:bold; color:#C97A3E; text-transform:uppercase; letter-spacing:0.5px;">Nota del administrador</p>
                <p style="margin:0; font-size:13px; color:#555; line-height:1.6;">${motivo}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>` : ''}

      <!-- Botón CTA -->
      <tr>
        <td style="padding:4px 36px 36px; text-align:center;">
          <a href="${frontendUrl}/dashboard/productor"
             style="display:inline-block; background:#2E4A33; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:6px; font-size:14px; font-weight:bold; letter-spacing:0.3px;">
            Ir a mi panel de productor &rarr;
          </a>
        </td>
      </tr>

      <!-- Pie -->
      <tr>
        <td bgcolor="#2E4A33" style="padding:14px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0; font-size:12px; color:#a8c4a2;">Marketplace de Mezcal · Oaxaca de Juárez, México</p>
              </td>
              <td align="right">
                <p style="margin:0; font-size:12px; color:#a8c4a2;">© ${year}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 36px 14px;">
          <p style="margin:0; font-size:11px; color:#aaa; text-align:center;">
            Recibiste este correo porque tu solicitud de productor fue procesada.<br>
            Si tienes dudas, visita <a href="${frontendUrl}" style="color:#C97A3E; text-decoration:none;">${frontendUrl.replace(/https?:\/\//, '')}</a>
          </p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>`;

    await this.sendEmail({
      to: email,
      subject: '🎉 ¡Tu solicitud de productor fue aprobada! — Marketplace de Mezcal',
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

  async sendFacturaSolicitudEmail(
    email: string,
    datos: {
      pedidoId: string;
      rfc: string;
      nombreRazonSocial: string;
      usoCfdi: string;
      regimenFiscal: string;
      total: number;
      moneda: string;
    },
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Factura #${datos.pedidoId}</title>
</head>
<body style="margin:0; padding:0; background-color:#f0ece0; font-family:Arial, Helvetica, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:20px 10px;">
    <table width="620" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #c8bfa8; max-width:620px;">

      <!-- Barra superior -->
      <tr>
        <td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33); font-size:1px; line-height:1px;">&nbsp;</td>
      </tr>

      <!-- Encabezado -->
      <tr>
        <td style="padding:24px 28px 16px; border-bottom:1px solid #c8bfa8;">
          <p style="margin:0 0 4px; font-size:11px; font-weight:bold; color:#C97A3E; text-transform:uppercase; letter-spacing:1px;">Marketplace de Mezcal</p>
          <h1 style="margin:0; font-size:22px; font-weight:bold; color:#2E4A33;">Solicitud de Factura Recibida</h1>
          <p style="margin:6px 0 0; font-size:13px; color:#666;">Pedido <strong style="color:#2E4A33;">#${datos.pedidoId}</strong></p>
        </td>
      </tr>

      <!-- Cuerpo -->
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 20px; font-size:14px; color:#333; line-height:1.6;">
            Hemos recibido tu solicitud de factura CFDI. A continuación encontrarás los datos con los que se generará:
          </p>

          <!-- Tabla de datos fiscales -->
          <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#c8bfa8; font-size:13px;">
            <tr bgcolor="#f7f3ec">
              <td colspan="2" style="padding:8px 12px; font-weight:bold; color:#2E4A33; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #c8bfa8;">
                Datos Fiscales del Receptor
              </td>
            </tr>
            <tr>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#777; width:40%;">RFC</td>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#1a1a1a; font-weight:600; font-family:monospace; letter-spacing:0.08em;">${datos.rfc}</td>
            </tr>
            <tr bgcolor="#fafaf8">
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#777;">Nombre / Razón Social</td>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#1a1a1a; font-weight:600;">${datos.nombreRazonSocial}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#777;">Uso CFDI</td>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#1a1a1a;">${datos.usoCfdi}</td>
            </tr>
            ${datos.regimenFiscal ? `<tr bgcolor="#fafaf8">
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#777;">Régimen Fiscal</td>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#1a1a1a;">${datos.regimenFiscal}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#777;">Total del Pedido</td>
              <td style="padding:9px 12px; border:1px solid #e0d9c8; color:#C97A3E; font-weight:700; font-size:14px;">$${datos.total.toFixed(2)} ${datos.moneda}</td>
            </tr>
          </table>

          <!-- Aviso de tiempo -->
          <div style="margin:20px 0 0; padding:14px 16px; background:#f7f3ec; border-left:4px solid #C97A3E; border-radius:0 6px 6px 0;">
            <p style="margin:0; font-size:13px; color:#2E4A33; line-height:1.6;">
              <strong>⏱ Tiempo de procesamiento:</strong> Tu CFDI será generado y enviado a este correo en un plazo de <strong>24 a 48 horas hábiles</strong>.
            </p>
          </div>

          <p style="margin:20px 0 0; font-size:13px; color:#888; line-height:1.6;">
            Si los datos no son correctos o necesitas hacer algún cambio, contáctanos lo antes posible respondiendo a este correo.
          </p>
        </td>
      </tr>

      <!-- Botón -->
      <tr>
        <td style="padding:0 28px 24px; text-align:center;">
          <a href="${frontendUrl}/tienda/compras"
             style="display:inline-block; background:#2E4A33; color:#ffffff; text-decoration:none; padding:11px 28px; border-radius:6px; font-size:13px; font-weight:bold; letter-spacing:0.3px;">
            Ver mis compras
          </a>
        </td>
      </tr>

      <!-- Pie -->
      <tr>
        <td bgcolor="#2E4A33" style="padding:10px 16px;">
          <p style="margin:0; font-size:11px; color:#a8c4a2; text-align:center;">
            MARKETPLACE DE MEZCAL · OAXACA, MÉXICO
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 16px 12px; border-top:1px solid #c8bfa8;">
          <p style="margin:0; font-size:10px; color:#aaa; text-align:center;">
            © ${year} Marketplace de Mezcal · Solicitud de factura para el pedido #${datos.pedidoId}
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>`;

    await this.sendEmail({
      to: email,
      subject: `Solicitud de factura recibida — Pedido #${datos.pedidoId}`,
      html,
    });
  }

  async sendFacturaEmail(
    email: string,
    datos: {
      pedidoId: string;
      folio: string;
      fecha: Date;
      rfc: string;
      nombreRazonSocial: string;
      usoCfdi: string;
      regimenFiscal: string;
      domicilioFiscal?: string;
      conceptos: { descripcion: string; clave?: string; unidad?: string; cantidad: number; precioUnitario: number; descuento?: number; importe: number; objImpuesto?: string }[];
      subtotal: number;
      iva?: number;
      total: number;
      moneda: string;
      formaPago?: string;
      metodoPago?: string;
    },
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();
    const fechaStr = new Date(datos.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const filasConceptos = datos.conceptos.map(c => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e0d9c8;">${c.descripcion}</td>
        <td style="padding:8px 12px;border:1px solid #e0d9c8;text-align:center;">${c.cantidad}</td>
        <td style="padding:8px 12px;border:1px solid #e0d9c8;text-align:right;">$${fmt(c.precioUnitario)}</td>
        <td style="padding:8px 12px;border:1px solid #e0d9c8;text-align:right;font-weight:600;">$${fmt(c.importe)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Factura ${datos.folio}</title>
</head>
<body style="margin:0;padding:0;background:#f0ece0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:24px 10px;">
  <table width="620" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #c8bfa8;max-width:620px;">

    <!-- Barra superior -->
    <tr><td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33);font-size:1px;line-height:1px;">&nbsp;</td></tr>

    <!-- Encabezado -->
    <tr><td style="padding:24px 28px 16px;border-bottom:1px solid #c8bfa8;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>
          <p style="margin:0 0 2px;font-size:11px;font-weight:bold;color:#C97A3E;text-transform:uppercase;letter-spacing:1px;">Marketplace de Mezcal</p>
          <h1 style="margin:0;font-size:22px;font-weight:bold;color:#2E4A33;">Factura</h1>
        </td>
        <td align="right">
          <p style="margin:0;font-size:13px;color:#555;">Folio: <strong style="font-family:monospace;color:#2E4A33;">${datos.folio}</strong></p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;">Fecha: ${fechaStr}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;">Pedido: #${datos.pedidoId}</p>
        </td>
      </tr></table>
    </td></tr>

    <!-- Datos fiscales -->
    <tr><td style="padding:20px 28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Emisor -->
          <td width="48%" valign="top" style="padding-right:8px;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:bold;color:#C97A3E;text-transform:uppercase;letter-spacing:0.5px;">Emisor</p>
            <p style="margin:0;font-size:12px;font-weight:bold;color:#1a1a1a;">Marketplace de Mezcal</p>
            <p style="margin:2px 0;font-size:11px;color:#666;">RFC: MAR010101AAA</p>
            <p style="margin:2px 0;font-size:11px;color:#666;">Régimen: 601 - General de Ley</p>
            <p style="margin:2px 0;font-size:11px;color:#666;">Oaxaca, México</p>
          </td>
          <!-- Receptor -->
          <td width="4%"></td>
          <td width="48%" valign="top" style="padding-left:8px;border-left:1px solid #e0d9c8;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:bold;color:#C97A3E;text-transform:uppercase;letter-spacing:0.5px;">Receptor</p>
            <p style="margin:0;font-size:12px;font-weight:bold;color:#1a1a1a;">${datos.nombreRazonSocial}</p>
            <p style="margin:2px 0;font-size:11px;color:#666;font-family:monospace;">RFC: ${datos.rfc}</p>
            ${datos.regimenFiscal ? `<p style="margin:2px 0;font-size:11px;color:#666;">Régimen: ${datos.regimenFiscal}</p>` : ''}
            <p style="margin:2px 0;font-size:11px;color:#666;">Uso CFDI: ${datos.usoCfdi}</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Conceptos -->
    <tr><td style="padding:20px 28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#c8bfa8;font-size:12px;">
        <tr bgcolor="#f7f3ec">
          <td style="padding:8px 12px;border:1px solid #c8bfa8;font-weight:bold;color:#2E4A33;font-size:11px;text-transform:uppercase;">Descripción</td>
          <td style="padding:8px 12px;border:1px solid #c8bfa8;font-weight:bold;color:#2E4A33;font-size:11px;text-align:center;">Cant.</td>
          <td style="padding:8px 12px;border:1px solid #c8bfa8;font-weight:bold;color:#2E4A33;font-size:11px;text-align:right;">Precio Unit.</td>
          <td style="padding:8px 12px;border:1px solid #c8bfa8;font-weight:bold;color:#2E4A33;font-size:11px;text-align:right;">Importe</td>
        </tr>
        ${filasConceptos}
      </table>
    </td></tr>

    <!-- Totales -->
    <tr><td style="padding:12px 28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td></td>
          <td width="220" style="border:1px solid #e0d9c8;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;">
              <tr>
                <td style="padding:7px 12px;color:#777;border-bottom:1px solid #f0ece0;">Subtotal</td>
                <td style="padding:7px 12px;text-align:right;color:#1a1a1a;border-bottom:1px solid #f0ece0;">$${fmt(datos.subtotal)} ${datos.moneda}</td>
              </tr>
              <tr>
                <td style="padding:7px 12px;color:#777;border-bottom:1px solid #f0ece0;">IVA (incluido)</td>
                <td style="padding:7px 12px;text-align:right;color:#1a1a1a;border-bottom:1px solid #f0ece0;">—</td>
              </tr>
              <tr bgcolor="#f7f3ec">
                <td style="padding:9px 12px;font-weight:bold;color:#2E4A33;font-size:13px;">Total</td>
                <td style="padding:9px 12px;text-align:right;font-weight:bold;color:#C97A3E;font-size:14px;">$${fmt(datos.total)} ${datos.moneda}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>


    <!-- Botón -->
    <tr><td style="padding:20px 28px;text-align:center;">
      <a href="${frontendUrl}/tienda/compras" style="display:inline-block;background:#2E4A33;color:#fff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:13px;font-weight:bold;">
        Ver mis compras
      </a>
    </td></tr>

    <!-- Pie -->
    <tr><td bgcolor="#2E4A33" style="padding:10px 16px;">
      <p style="margin:0;font-size:11px;color:#a8c4a2;text-align:center;">MARKETPLACE DE MEZCAL · OAXACA, MÉXICO</p>
    </td></tr>
    <tr><td style="padding:8px 16px 12px;border-top:1px solid #c8bfa8;">
      <p style="margin:0;font-size:10px;color:#aaa;text-align:center;">© ${year} Marketplace de Mezcal · Folio ${datos.folio}</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

    // Generar PDF adjunto
    let pdfBuffer: Buffer | undefined;
    try {
      const iva = datos.iva ?? Math.round(datos.subtotal * 0.16 * 100) / 100;
      pdfBuffer = await this.facturaPdfService.generate({
        serie: 'F',
        folio: datos.folio,
        fecha: datos.fecha,
        pedidoId: datos.pedidoId,
        emisor: {
          nombre: 'Marketplace de Mezcal',
          rfc: 'MAR010101AAA',
          regimen: '601 - General de Ley Personas Morales',
          direccion: 'Oaxaca de Juárez, Oaxaca, México',
          cp: '68000',
          lugarExpedicion: '68000',
        },
        receptor: {
          nombre: datos.nombreRazonSocial,
          rfc: datos.rfc,
          regimen: datos.regimenFiscal || '616 - Sin obligaciones fiscales',
          usoCfdi: datos.usoCfdi,
          domicilioFiscal: datos.domicilioFiscal ?? '68000',
        },
        conceptos: datos.conceptos.map(c => ({
          descripcion: c.descripcion,
          clave: c.clave ?? '50202306',
          unidad: c.unidad ?? 'H87 · Pieza',
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
          descuento: c.descuento ?? 0,
          importe: c.importe,
          objImpuesto: c.objImpuesto ?? '02',
        })),
        subtotal: datos.subtotal,
        iva,
        total: datos.total,
        moneda: datos.moneda,
        formaPago: datos.formaPago ?? '03',
        metodoPago: datos.metodoPago ?? 'Pago en una sola exhibición',
      });
    } catch (e: any) {
      this.logger.error(`[factura-pdf] Error generando PDF: ${e?.message}`);
    }

    await this.sendEmail({
      to: email,
      subject: `Factura ${datos.folio} — Pedido #${datos.pedidoId} · Marketplace de Mezcal`,
      html,
      attachments: pdfBuffer
        ? [{ filename: `factura-${datos.folio}.pdf`, content: pdfBuffer, type: 'application/pdf' }]
        : [],
    });
  }

  async sendAdminAlert(subject: string, body: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || this.fromEmail;
    await this.sendEmail({
      to: adminEmail,
      subject: `[Alerta Marketplace] ${subject}`,
      html: `<p style="font-family:monospace;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    });
  }
}