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