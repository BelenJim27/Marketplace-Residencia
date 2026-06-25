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
  // 'transactional' (default) siempre se envía. 'marketing' respeta email_opt_out (CAN-SPAM).
  category?: 'transactional' | 'marketing';
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

  async sendWelcomeEmail(email: string, name: string, lang: 'es' | 'en' = 'es'): Promise<void> {
    const en = lang === 'en';
    const t = en
      ? {
          subject: 'Welcome to Marketplace!',
          title: 'Welcome to Marketplace!',
          hi: `Hi ${name},`,
          body: 'Your account has been created successfully. We are excited to have you on our platform.',
          hereYouCan: 'Here you can:',
          li: ['Explore products from multiple producers', 'Make secure purchases', 'Track your orders'],
        }
      : {
          subject: '¡Bienvenido a Marketplace!',
          title: '¡Bienvenido a Marketplace!',
          hi: `Hola ${name},`,
          body: 'Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte en nuestra plataforma.',
          hereYouCan: 'Aquí puedes:',
          li: ['Explorar productos de múltiples productores', 'Realizar compras seguras', 'Rastrear tus órdenes'],
        };

    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
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
            <h2>${t.title}</h2>
            <p>${t.hi}</p>
            <p>${t.body}</p>
            <p>${t.hereYouCan}</p>
            <ul>
              ${t.li.map((x) => `<li>${x}</li>`).join('\n              ')}
            </ul>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Marketplace</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject: t.subject, html });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, lang: 'es' | 'en' = 'es'): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const en = lang === 'en';
    const t = en
      ? {
          subject: 'Reset your password',
          title: 'Reset your password',
          body: 'You requested to reset your password. Click the button below to create a new one:',
          button: 'Reset password',
          expires: 'This link expires in 30 minutes.',
          ignore: 'If you did not request this change, you can ignore this email.',
        }
      : {
          subject: 'Recuperar tu contraseña',
          title: 'Recuperar contraseña',
          body: 'Has solicitado recuperar tu contraseña. Haz clic en el botón abajo para crear una nueva:',
          button: 'Restablecer contraseña',
          expires: 'Este enlace caduca en 30 minutos.',
          ignore: 'Si no solicitaste este cambio, puedes ignorar este correo.',
        };

    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
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
            <h2>${t.title}</h2>
            <p>${t.body}</p>
            <a href="${resetUrl}" class="button">${t.button}</a>
            <p>${t.expires}</p>
            <p>${t.ignore}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Marketplace</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject: t.subject, html });
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

    // ===== Versión en inglés (clientes de EE.UU. / locale en) =====
    // Recibo limpio SIN andamiaje fiscal mexicano (RFC, CFDI, IVA 16%): los precios
    // en USD no son IVA-incluido y no aplica CFDI a ventas en EE.UU.
    if (options?.lang === 'en') {
      const frontendUrlEn = process.env.FRONTEND_URL || 'http://localhost:3000';
      const fechaEn = new Date(fechaISO).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
      const itemsRowsEn = (options?.items ?? []).map((item) => {
        const importe = Number(item.precio_unitario) * item.cantidad;
        return `
        <tr>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:center; font-size:12px; color:#333;">${item.cantidad}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; font-size:12px; color:#333;">${item.nombre}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:right; font-size:12px; color:#333;">$${Number(item.precio_unitario).toFixed(2)}</td>
          <td style="padding:8px 6px; border:1px solid #ddd; text-align:right; font-size:12px; font-weight:600; color:#1a1a1a;">$${importe.toFixed(2)}</td>
        </tr>`;
      }).join('');
      const alcoholBlockEn = incluyeAlcohol
        ? `<tr><td colspan="2" style="padding:12px 16px; background:#fffbeb; border-top:2px solid #b45309;">
            <p style="margin:0 0 6px; font-size:11px; color:#78350f; font-weight:bold; text-transform:uppercase;">Government Warning</p>
            <p style="margin:0; font-size:11px; color:#78350f; line-height:1.5;">
              <strong>(1)</strong> According to the Surgeon General, women should not drink alcoholic beverages during pregnancy.<br>
              <strong>(2)</strong> Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery.
            </p>
          </td></tr>`
        : '';

      const htmlEn = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${orderNumber}</title>
</head>
<body style="margin:0; padding:0; background-color:#f0ece0; font-family:Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:20px 10px;">
    <table width="620" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #c8bfa8; max-width:620px;">
      <tr><td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33); font-size:1px; line-height:1px;">&nbsp;</td></tr>
      <tr>
        <td style="padding:16px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:#2E4A33; color:#F4F0E3; font-size:22px; font-weight:bold; padding:6px 12px; border-radius:4px; letter-spacing:2px;">&#127807; MEZCAL</td>
          </tr></table>
          <p style="margin:10px 0 2px; font-size:13px; font-weight:bold; color:#1a1a1a;">Oaxacan Mezcal Marketplace</p>
          <p style="margin:0; font-size:11px; color:#555;">Oaxaca de Juárez, Oaxaca, Mexico</p>
        </td>
      </tr>
      <tr><td style="padding:0 16px 8px;">
        <h2 style="margin:6px 0; font-size:18px; color:#2E4A33;">Thank you for your order, ${nombreCliente}!</h2>
        <p style="margin:0; font-size:13px; color:#444;">Order <strong>#${orderNumber}</strong> &middot; ${fechaEn} &middot; <span style="color:#16a34a; font-weight:bold;">&#10003; PAID</span></p>
        <p style="margin:4px 0 0; font-size:12px; color:#555;">Confirmation sent to ${email}</p>
      </td></tr>
      ${options?.items?.length ? `
      <tr><td style="padding:8px 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse; border-color:#ddd; font-size:12px;">
          <tr bgcolor="#f7f3ec">
            <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:center; color:#2E4A33; width:40px;">Qty</th>
            <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:left; color:#2E4A33;">Description</th>
            <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:right; color:#2E4A33; width:90px;">Unit Price</th>
            <th style="padding:8px 6px; border:1px solid #c8bfa8; text-align:right; color:#2E4A33; width:90px;">Amount</th>
          </tr>
          ${itemsRowsEn}
        </table>
      </td></tr>` : ''}
      <tr><td style="padding:14px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="52%" valign="top" style="font-size:12px; color:#444;">
            <p style="margin:0 0 4px;"><strong>Payment method:</strong> ${metodoPago}</p>
            <p style="margin:0;"><strong>Currency:</strong> ${moneda}</p>
          </td>
          <td width="48%" valign="top">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;">
              <tr><td style="padding:3px 0; color:#555;">Subtotal</td><td style="padding:3px 0; text-align:right; color:#333;">$${subtotal.toFixed(2)}</td></tr>
              ${shipping > 0 ? `<tr><td style="padding:3px 0; color:#555;">Shipping</td><td style="padding:3px 0; text-align:right; color:#333;">$${shipping.toFixed(2)}</td></tr>` : ''}
              ${tax > 0 ? `<tr><td style="padding:3px 0; color:#555;">Sales Tax</td><td style="padding:3px 0; text-align:right; color:#333;">$${tax.toFixed(2)}</td></tr>` : ''}
              <tr style="border-top:2px solid #C97A3E;"><td style="padding:6px 0 2px; font-weight:bold; font-size:14px; color:#2E4A33;">Total</td><td style="padding:6px 0 2px; text-align:right; font-weight:bold; font-size:15px; color:#C97A3E;">$${totalAmount.toFixed(2)}&nbsp;${moneda}</td></tr>
            </table>
          </td>
        </tr>
        ${alcoholBlockEn}
        </table>
      </td></tr>
      <tr><td style="padding:8px 16px 20px; text-align:center; border-top:1px solid #c8bfa8;">
        <a href="${frontendUrlEn}/tienda/compras" style="display:inline-block; background:#2E4A33; color:#ffffff; text-decoration:none; padding:11px 28px; border-radius:6px; font-size:13px; font-weight:bold;">View my orders</a>
      </td></tr>
      <tr><td bgcolor="#2E4A33" style="padding:10px 16px;">
        <p style="margin:0; font-size:11px; color:#a8c4a2; text-align:center;">This is an online purchase confirmation.</p>
      </td></tr>
      <tr><td style="padding:8px 16px 12px;">
        <p style="margin:0; font-size:10px; color:#aaa; text-align:center;">© ${new Date().getFullYear()} Mezcal Marketplace · Oaxaca, Mexico</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

      await this.sendEmail({
        to: email,
        subject: `Order confirmation #${orderNumber} - Mezcal Marketplace`,
        html: htmlEn,
      });
      return;
    }

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

  /**
   * Cabeceras de baja (CAN-SPAM): ofrecen un mecanismo de unsubscribe por mailto
   * (siempre funcional) y por URL, además de one-click. Se aplican a todos los
   * envíos para cumplir con el correo comercial en EE.UU.
   */
  private unsubscribeHeaders(to: string): Record<string, string> {
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;
    const mail = process.env.EMAIL_FROM || this.fromEmail;
    return {
      'List-Unsubscribe': `<mailto:${mail}?subject=unsubscribe>, <${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    // CAN-SPAM: los correos de marketing respetan la baja del usuario; los
    // transaccionales (default) siempre se envían.
    if (options.category === 'marketing') {
      const dest = await this.prisma.usuarios.findFirst({
        where: { email: options.to.trim().toLowerCase() },
        select: { email_opt_out: true },
      });
      if (dest?.email_opt_out) {
        this.logger.log(`[email] Omitido (marketing, opt-out): ${redactEmail(options.to)} — "${options.subject}"`);
        return;
      }
    }

    const unsubHeaders = this.unsubscribeHeaders(options.to);
    // Prioridad 1: Gmail SMTP (más confiable para desarrollo)
    if (this.gmailTransport) {
      await this.gmailTransport.sendMail({
        from: `"Marketplace de Mezcal" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: unsubHeaders,
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
            headers: unsubHeaders,
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
                <p style="margin:0 0 4px; font-size:11px; font-weight:bold; color:#C97A3E; text-transform:uppercase; letter-spacing:1.5px;">MEZCANEA · Oaxaca</p>
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
                      <p style="margin:0; font-size:13px; color:#333; line-height:1.5;"><strong>Publica tus productos</strong> — Agrega fotos, precios e inventario de tu mezcal.</p>
                    </td>
                  </tr>
                  <tr>
                    <td valign="top" width="28" style="padding-bottom:16px;">
                      <span style="display:inline-block; width:22px; height:22px; background:#2E4A33; border-radius:50%; text-align:center; line-height:22px; color:#fff; font-size:11px; font-weight:bold;">2</span>
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
                <p style="margin:0; font-size:12px; color:#a8c4a2;">MEZCANEA · Oaxaca de Juárez, México</p>
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
      subject: '🎉 ¡Tu solicitud de productor fue aprobada! — MEZCANEA',
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
  <title>Documento preliminar ${datos.folio}</title>
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
          <h1 style="margin:0;font-size:22px;font-weight:bold;color:#2E4A33;">Documento preliminar</h1>
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
            <p style="margin:2px 0;font-size:11px;color:#666;">Datos fiscales pendientes de timbrado PAC</p>
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

    <tr><td style="padding:16px 28px 0;">
      <div style="padding:12px 14px;border:1px solid #e7b76b;background:#fff7e8;color:#6b4a1f;font-size:12px;line-height:1.5;">
        <strong>Documento preliminar sin validez fiscal.</strong><br>
        No contiene timbrado, UUID ni certificados del SAT. La emisión de CFDI requerirá una integración posterior con un PAC.
      </div>
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
        folio: datos.folio.replace(/^F-/, ''),
        fecha: datos.fecha,
        pedidoId: datos.pedidoId,
        emisor: {
          nombre: 'Marketplace de Mezcal',
          rfc: '',
          regimen: 'Pendiente de timbrado',
          direccion: 'Oaxaca de Juárez, Oaxaca, México',
          cp: '68000',
          lugarExpedicion: '68000',
        },
        receptor: {
          nombre: datos.nombreRazonSocial,
          rfc: datos.rfc,
          regimen: datos.regimenFiscal || '616 - Sin obligaciones fiscales',
          usoCfdi: datos.usoCfdi,
          domicilioFiscal: datos.domicilioFiscal,
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
      subject: `Documento preliminar ${datos.folio} — Pedido #${datos.pedidoId} · Marketplace de Mezcal`,
      html,
      attachments: pdfBuffer
        ? [{ filename: `factura-${datos.folio}.pdf`, content: pdfBuffer, type: 'application/pdf' }]
        : [],
    });
  }

  async sendTrackingUpdateEmail(
    email: string,
    nombreCliente: string,
    pedidoId: string,
    numeroGuia: string,
    estado: string,
    lang: 'es' | 'en' = 'es',
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();
    const en = lang === 'en';

    type EstadoInfo = { asunto: string; titulo: string; icono: string; mensaje: string; color: string };
    const ESTADOS_ES: Record<string, EstadoInfo> = {
      en_transito: {
        asunto: `Tu pedido #${pedidoId} está en camino`,
        titulo: 'Tu pedido está en camino',
        icono: '🚚',
        mensaje: 'Tu paquete fue recogido y ya está en tránsito hacia tu domicilio.',
        color: '#2563eb',
      },
      en_reparto: {
        asunto: `Tu pedido #${pedidoId} está cerca`,
        titulo: 'Tu pedido está en reparto',
        icono: '📦',
        mensaje: 'Tu paquete está en reparto local y llegará hoy.',
        color: '#C97A3E',
      },
      entregado: {
        asunto: `Tu pedido #${pedidoId} fue entregado`,
        titulo: '¡Tu pedido llegó!',
        icono: '✅',
        mensaje: 'Tu paquete fue entregado exitosamente. Si tienes algún problema, contáctanos.',
        color: '#2E4A33',
      },
    };
    const ESTADOS_EN: Record<string, EstadoInfo> = {
      en_transito: {
        asunto: `Your order #${pedidoId} is on its way`,
        titulo: 'Your order is on its way',
        icono: '🚚',
        mensaje: 'Your package has been picked up and is now in transit to your address.',
        color: '#2563eb',
      },
      en_reparto: {
        asunto: `Your order #${pedidoId} is almost there`,
        titulo: 'Your order is out for delivery',
        icono: '📦',
        mensaje: 'Your package is out for local delivery and will arrive today.',
        color: '#C97A3E',
      },
      entregado: {
        asunto: `Your order #${pedidoId} was delivered`,
        titulo: 'Your order has arrived!',
        icono: '✅',
        mensaje: 'Your package was delivered successfully. If you have any issues, contact us.',
        color: '#2E4A33',
      },
    };

    const estados = en ? ESTADOS_EN : ESTADOS_ES;
    const info = estados[estado] ?? (en
      ? {
          asunto: `Update on your order #${pedidoId}`,
          titulo: 'Shipping update',
          icono: '📬',
          mensaje: `Your shipment status changed to: ${estado}.`,
          color: '#2E4A33',
        }
      : {
          asunto: `Actualización de tu pedido #${pedidoId}`,
          titulo: 'Actualización de envío',
          icono: '📬',
          mensaje: `El estado de tu envío cambió a: ${estado}.`,
          color: '#2E4A33',
        });

    const L = en
      ? { hi: 'Hi', order: 'Order', tracking: 'Tracking number', status: 'Status', button: 'View order details', footer: 'Automatic shipping notification' }
      : { hi: 'Hola', order: 'Pedido', tracking: 'Número de guía', status: 'Estado', button: 'Ver detalles del pedido', footer: 'Notificación automática de envío' };

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${info.asunto}</title>
</head>
<body style="margin:0;padding:0;background:#f0ece0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece0">
  <tr><td align="center" style="padding:28px 10px;">
  <table width="580" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:1px solid #c8bfa8;max-width:580px;">

    <tr><td height="5" style="background:linear-gradient(90deg,#2E4A33,#C97A3E,#C89B4A,#C97A3E,#2E4A33);font-size:1px;line-height:1px;">&nbsp;</td></tr>

    <!-- Encabezado -->
    <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #e8e0d0;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#C97A3E;text-transform:uppercase;letter-spacing:1.5px;">MEZCANEA · Oaxaca</p>
      <h1 style="margin:0;font-size:24px;font-weight:bold;color:#2E4A33;">${info.icono}&nbsp; ${info.titulo}</h1>
    </td></tr>

    <!-- Cuerpo -->
    <tr><td style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.7;">${L.hi} <strong>${nombreCliente}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">${info.mensaje}</p>

      <!-- Tarjeta de info -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f3ec;border-radius:8px;border:1px solid #e8e0d0;">
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#888;width:40%;">${L.order}</td>
                <td style="padding:4px 0;font-size:13px;color:#1a1a1a;font-weight:bold;">#${pedidoId}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#888;">${L.tracking}</td>
                <td style="padding:4px 0;font-size:13px;color:#1a1a1a;font-family:monospace;">${numeroGuia}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#888;">${L.status}</td>
                <td style="padding:4px 0;">
                  <span style="display:inline-block;background:${info.color};color:#fff;font-size:11px;font-weight:bold;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">${estado.replace(/_/g, ' ')}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Botón -->
    <tr><td style="padding:0 32px 28px;text-align:center;">
      <a href="${frontendUrl}/tienda/compras"
         style="display:inline-block;background:#2E4A33;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:13px;font-weight:bold;letter-spacing:0.3px;">
        ${L.button} &rarr;
      </a>
    </td></tr>

    <!-- Pie -->
    <tr><td bgcolor="#2E4A33" style="padding:10px 16px;">
      <p style="margin:0;font-size:11px;color:#a8c4a2;text-align:center;">MEZCANEA · OAXACA, MÉXICO</p>
    </td></tr>
    <tr><td style="padding:8px 16px 12px;border-top:1px solid #c8bfa8;">
      <p style="margin:0;font-size:10px;color:#aaa;text-align:center;">© ${year} Marketplace de Mezcal · ${L.footer}</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.sendEmail({ to: email, subject: info.asunto, html });
  }

  /**
   * Registra y PERSISTE una baja de correos (CAN-SPAM): marca usuarios.email_opt_out=true
   * para el email dado, de modo que los envíos de marketing se omitan. Los correos
   * transaccionales no se ven afectados. El header List-Unsubscribe (mailto) y la
   * página /unsubscribe apuntan aquí.
   */
  async recordUnsubscribeRequest(email: string): Promise<{ ok: true }> {
    const clean = (email || '').trim().toLowerCase();
    this.logger.log(`[unsubscribe] Solicitud de baja recibida: ${redactEmail(clean)}`);

    try {
      const result = await this.prisma.usuarios.updateMany({
        where: { email: clean },
        data: { email_opt_out: true },
      });
      // Si no hay usuario con ese email (suscriptor anónimo), igual avisamos al admin.
      if (result.count === 0) {
        await this.sendAdminAlert(
          'Solicitud de baja de correos (sin usuario)',
          `El email ${clean} solicitó baja pero no corresponde a una cuenta registrada. ` +
            `Agrégalo a la lista de supresión si envías a esa dirección.`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`[unsubscribe] No se pudo persistir/alertar la baja: ${err?.message ?? err}`);
    }

    return { ok: true };
  }

  async sendAdminAlert(subject: string, body: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || this.fromEmail;
    await this.sendEmail({
      to: adminEmail,
      subject: `[Alerta Marketplace] ${subject}`,
      html: `<p style="font-family:monospace;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    });
  }

  async sendContactoEmail(dto: { nombre: string; email: string; asunto: string; categoria: string; mensaje: string }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || this.fromEmail;
    const categoriasLabel: Record<string, string> = {
      pedido: 'Pedido',
      producto: 'Producto',
      pago: 'Pago',
      envio: 'Envío',
      otro: 'Otro',
    };
    const categoriaLabel = categoriasLabel[dto.categoria] ?? dto.categoria;
    const safe = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await this.sendEmail({
      to: adminEmail,
      subject: `[Soporte] ${categoriaLabel} — ${safe(dto.asunto)}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2E4A33;border-bottom:2px solid #2E4A33;padding-bottom:8px">Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr style="background:#f5f5f5"><td style="padding:10px 12px;font-weight:600;color:#555;width:110px">De:</td><td style="padding:10px 12px">${safe(dto.nombre)} &lt;${safe(dto.email)}&gt;</td></tr>
            <tr><td style="padding:10px 12px;font-weight:600;color:#555">Categoría:</td><td style="padding:10px 12px">${safe(categoriaLabel)}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:10px 12px;font-weight:600;color:#555">Asunto:</td><td style="padding:10px 12px">${safe(dto.asunto)}</td></tr>
          </table>
          <div style="background:#fafafa;border-left:4px solid #2E4A33;padding:16px 20px;border-radius:4px">
            <p style="margin:0;white-space:pre-wrap;color:#333">${safe(dto.mensaje)}</p>
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px">© ${new Date().getFullYear()} Marketplace Mezcal · Mensaje recibido vía formulario de soporte</p>
        </div>
      `,
    });
  }
}
