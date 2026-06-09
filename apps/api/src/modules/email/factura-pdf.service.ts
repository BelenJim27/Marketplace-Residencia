import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface FacturaPdfData {
  folio: string;
  serie: string;
  fecha: Date;
  pedidoId: string;
  emisor: { nombre: string; rfc: string; regimen: string; direccion: string; cp: string; lugarExpedicion: string };
  receptor: { nombre: string; rfc: string; regimen: string; usoCfdi: string; domicilioFiscal?: string };
  conceptos: { descripcion: string; clave: string; unidad: string; cantidad: number; precioUnitario: number; descuento: number; importe: number; objImpuesto: string }[];
  subtotal: number;
  iva: number;
  total: number;
  moneda: string;
  formaPago: string;
  metodoPago: string;
}

const G = '#2E4A33';
const C = '#C97A3E';
const GRAY = '#555555';
const LGRAY = '#888888';
const BLACK = '#1a1a1a';
const LIGHT = '#f5f2eb';
const WHITE = '#ffffff';
const THEAD = '#1a3528';

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function numeroALetras(n: number, moneda = 'MXN'): string {
  const entero = Math.floor(n);
  const decimales = Math.round((n - entero) * 100);
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const triple = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return unidades[n];
    if (n < 100) return decenas[Math.floor(n / 10)] + (n % 10 ? ' Y ' + unidades[n % 10] : '');
    if (n === 100) return 'CIEN';
    return centenas[Math.floor(n / 100)] + (n % 100 ? ' ' + triple(n % 100) : '');
  };

  let resultado = '';
  if (entero >= 1000) resultado = triple(Math.floor(entero / 1000)) + ' MIL';
  resultado += (resultado ? ' ' : '') + triple(entero % 1000);
  return `${resultado.trim()} ${decimales.toString().padStart(2, '0')}/100 ${moneda}`;
}

@Injectable()
export class FacturaPdfService {
  async generate(data: FacturaPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 36, info: { Title: `Factura ${data.serie}-${data.folio}` } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = doc.page.width;
      const PH = doc.page.height;
      const ML = 36; // margin left
      const MR = 36; // margin right
      const W = PW - ML - MR;
      const fechaStr = (d: Date) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      // ════════════════════════════════════════════════════════
      // TOP GREEN BAR
      // ════════════════════════════════════════════════════════
      doc.rect(ML, 30, W, 4).fill(G);

      // ════════════════════════════════════════════════════════
      // HEADER — Emisor (left) + FACTURA box (right)
      // ════════════════════════════════════════════════════════
      const headerY = 42;
      const leftW = W * 0.56;
      const rightW = W * 0.40;
      const rightX = ML + W - rightW;

      // Logo del sistema
      const logoPath = path.join(__dirname, '../../assets/logo.png');
      const logoSize = 38;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, ML, headerY, { fit: [logoSize, logoSize] });
      } else {
        doc.circle(ML + 18, headerY + 18, 18).fill(G);
        doc.polygon(
          [ML + 18, headerY + 6],
          [ML + 28, headerY + 18],
          [ML + 18, headerY + 30],
          [ML + 8,  headerY + 18]
        ).fill(C);
      }

      // Emisor info
      const exL = ML + 44;
      doc.fillColor(C).fontSize(13).font('Helvetica-Bold')
        .text(data.emisor.nombre, exL, headerY, { width: leftW - 42 });
      doc.fillColor(GRAY).fontSize(7.5).font('Helvetica')
        .text(`${data.emisor.direccion}`, exL, headerY + 16, { width: leftW - 42 })
        .text(`C.P. ${data.emisor.cp} · Calle Macedonio Alcalá 100`, exL, undefined, { width: leftW - 42 })
        .text(`RFC: ${data.emisor.rfc}`, exL, undefined, { width: leftW - 42 });
      doc.fillColor(C).fontSize(7.5)
        .text(`Régimen Fiscal: ${data.emisor.regimen}`, exL, undefined, { width: leftW - 42 });
      doc.fillColor(GRAY)
        .text(`Lugar de expedición: ${data.emisor.lugarExpedicion}`, exL, undefined, { width: leftW - 42 });

      // FACTURA box (right)
      doc.rect(rightX, headerY, rightW, 16).fill(G);
      doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
        .text('FACTURA', rightX, headerY + 3, { width: rightW, align: 'center' });

      const infoY = headerY + 20;
      const lCol = rightX + 4;
      const rCol = rightX + rightW * 0.45;
      const colW = rightW * 0.42;

      const row = (label: string, value: string, yOff: number, labelColor = C, valColor = BLACK) => {
        doc.fillColor(labelColor).fontSize(7).font('Helvetica-Bold')
          .text(label, lCol, infoY + yOff, { width: rightW * 0.4 });
        doc.fillColor(valColor).fontSize(7).font('Helvetica')
          .text(value, rCol, infoY + yOff, { width: colW });
      };

      row('Serie - Folio', `${data.serie}  ${data.folio}`, 0);
      row('Pedido', `#${data.pedidoId}`, 10);
      row('Fecha de Emisión', fechaStr(data.fecha), 20);
      row('Fecha Certificación', fechaStr(data.fecha), 30);

      const mockUUID = `4317E07-3B94-4E59-8C0C-0963B5854B90`;
      const mockCert = `00001000000512083194`;
      const mockSAT  = `00001000000704859748`;

      doc.moveDown(0);
      const uuidY = infoY + 44;
      doc.fillColor(C).fontSize(6.5).font('Helvetica-Bold')
        .text('FOLIO FISCAL (UUID)', lCol, uuidY);
      doc.fillColor(GRAY).fontSize(6.5).font('Helvetica')
        .text(mockUUID, lCol, uuidY + 8, { width: rightW - 8 });
      doc.fillColor(C).fontSize(6.5).font('Helvetica-Bold')
        .text('NO. CERTIFICADO DIGITAL', lCol, uuidY + 20);
      doc.fillColor(GRAY).fontSize(6.5).font('Helvetica')
        .text(mockCert, lCol, uuidY + 28, { width: rightW - 8 });
      doc.fillColor(C).fontSize(6.5).font('Helvetica-Bold')
        .text('NO. SERIE CERTIFICADO SAT', lCol, uuidY + 40);
      doc.fillColor(GRAY).fontSize(6.5).font('Helvetica')
        .text(mockSAT, lCol, uuidY + 48, { width: rightW - 8 });

      // Border around FACTURA box
      doc.rect(rightX, headerY, rightW, uuidY + 58 - headerY).stroke('#c8bfa8');

      // ════════════════════════════════════════════════════════
      // RECEPTOR SECTION
      // ════════════════════════════════════════════════════════
      const secY1 = Math.max(doc.y + 8, uuidY + 64);
      doc.rect(ML, secY1, W, 14).fill(G);
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('RECEPTOR', ML + 6, secY1 + 3);

      let ry = secY1 + 18;
      doc.fillColor(BLACK).fontSize(9).font('Helvetica-Bold')
        .text(data.receptor.nombre, ML + 4, ry);
      ry += 13;

      const col1X = ML + 4;
      const col2X = ML + W * 0.42;
      const colWh = W * 0.4;

      const recRow = (l1: string, v1: string, l2: string, v2: string) => {
        doc.fillColor(C).fontSize(7).font('Helvetica-Bold').text(l1, col1X, ry, { width: colWh });
        doc.fillColor(GRAY).fontSize(7).font('Helvetica').text(v1, col1X + 80, ry, { width: colWh });
        doc.fillColor(C).fontSize(7).font('Helvetica-Bold').text(l2, col2X, ry, { width: colWh });
        doc.fillColor(GRAY).fontSize(7).font('Helvetica').text(v2, col2X + 80, ry, { width: colWh });
        ry += 11;
      };

      recRow('RFC:', data.receptor.rfc, 'Uso CFDI:', data.receptor.usoCfdi);
      recRow('Domicilio Fiscal (C.P.):', data.receptor.domicilioFiscal ?? '—', 'Régimen Fiscal:', data.receptor.regimen);
      ry += 4;

      // ════════════════════════════════════════════════════════
      // CONCEPTOS TABLE
      // ════════════════════════════════════════════════════════
      doc.rect(ML, ry, W, 14).fill(G);
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('CONCEPTOS', ML + 6, ry + 3);
      ry += 14;

      // Table header
      const cols = {
        cant:  { x: ML,           w: 28 },
        clave: { x: ML + 28,      w: 68 },
        desc:  { x: ML + 96,      w: 148 },
        obj:   { x: ML + 244,     w: 46 },
        price: { x: ML + 290,     w: 60 },
        desc2: { x: ML + 350,     w: 50 },
        imp:   { x: ML + 400,     w: W - 400 },
      };

      doc.rect(ML, ry, W, 14).fill(THEAD);
      doc.fillColor(WHITE).fontSize(6.5).font('Helvetica-Bold');
      const th = (text: string, col: { x: number; w: number }, align: 'left' | 'center' | 'right' = 'center') => {
        doc.text(text, col.x + 2, ry + 4, { width: col.w - 4, align });
      };
      th('Cant.',      cols.cant,  'center');
      th('Clave/Unidad', cols.clave, 'left');
      th('Descripción',  cols.desc,  'left');
      th('Obj. Imp.',    cols.obj,   'center');
      th('Precio',       cols.price, 'right');
      th('Descuento',    cols.desc2, 'right');
      th('Importe',      cols.imp,   'right');
      ry += 14;

      data.conceptos.forEach((c, i) => {
        const bg = i % 2 === 0 ? WHITE : '#f9f7f3';
        const rowH = 22;
        doc.rect(ML, ry, W, rowH).fill(bg);
        doc.fillColor(BLACK).fontSize(7).font('Helvetica');
        doc.text(String(c.cantidad), cols.cant.x + 2,  ry + 4, { width: cols.cant.w - 4,  align: 'center' });
        doc.text(`${c.clave}\n${c.unidad}`,  cols.clave.x + 2, ry + 2, { width: cols.clave.w - 4, align: 'left' });
        doc.text(c.descripcion,        cols.desc.x + 2,  ry + 4, { width: cols.desc.w - 4,  align: 'left' });
        doc.text(c.objImpuesto,        cols.obj.x + 2,   ry + 4, { width: cols.obj.w - 4,   align: 'center' });
        doc.text(fmt(c.precioUnitario),cols.price.x + 2, ry + 4, { width: cols.price.w - 4, align: 'right' });
        doc.text(fmt(c.descuento),     cols.desc2.x + 2, ry + 4, { width: cols.desc2.w - 4, align: 'right' });
        doc.font('Helvetica-Bold')
          .text(fmt(c.importe),        cols.imp.x + 2,   ry + 4, { width: cols.imp.w - 6,   align: 'right' });
        doc.rect(ML, ry, W, rowH).stroke('#e0d9c8');
        ry += rowH;
      });

      // IVA row
      const ivaBase = data.subtotal;
      doc.rect(ML, ry, W, 14).fill('#f0ece0');
      doc.fillColor(G).fontSize(7).font('Helvetica-Bold')
        .text('IMPUESTO TRASLADADO', ML + 6, ry + 4, { width: 140 });
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text(`Base $${fmt(ivaBase).slice(1)}`, ML + 150, ry + 4, { width: 80 });
      doc.text('IVA', ML + 250, ry + 4, { width: 40, align: 'center' });
      doc.text('Tasa', ML + 310, ry + 4, { width: 60, align: 'center' });
      doc.text('0.160000', ML + 370, ry + 4, { width: 50, align: 'center' });
      doc.fillColor(BLACK).font('Helvetica-Bold')
        .text(fmt(data.iva), cols.imp.x + 2, ry + 4, { width: cols.imp.w - 6, align: 'right' });
      doc.rect(ML, ry, W, 14).stroke('#c8bfa8');
      ry += 18;

      // ════════════════════════════════════════════════════════
      // BOTTOM: Payment info (left) + Totals (right)
      // ════════════════════════════════════════════════════════
      const botLeftW = W * 0.52;
      const botRightW = W * 0.44;
      const botRightX = ML + W - botRightW;

      // Payment info
      const payInfo = [
        ['Forma de pago:',       '03 - Transferencia electrónica'],
        ['Método de pago:',      `PUE - ${data.metodoPago}`],
        ['Referencia:',          'PÚBLICO EN GENERAL'],
        ['Moneda:',              `${data.moneda} - Peso Mexicano`],
        ['Tipo de Comprobante:', 'I - Ingreso'],
        ['Exportación:',         '01 - No aplica'],
      ];

      let py = ry;
      payInfo.forEach(([label, value]) => {
        doc.fillColor(GRAY).fontSize(7).font('Helvetica-Bold')
          .text(label, ML, py, { width: 90, continued: false });
        doc.fillColor(BLACK).font('Helvetica')
          .text(value, ML + 92, py, { width: botLeftW - 92 });
        py += 11;
      });

      // IMPORTES TOTALES box
      doc.rect(botRightX, ry, botRightW, 14).fill(G);
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('IMPORTES TOTALES', botRightX + 4, ry + 3, { width: botRightW - 8, align: 'center' });

      const totRow = (label: string, value: string, bold = false, highlight = false) => {
        const ty = ry + 14 + (highlight ? 2 : 0);
        if (highlight) doc.rect(botRightX, ty - 2, botRightW, 16).fill(LIGHT);
        doc.fillColor(highlight ? G : GRAY).fontSize(highlight ? 8 : 7.5)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, botRightX + 6, ty, { width: botRightW * 0.55 });
        doc.fillColor(highlight ? C : BLACK).font('Helvetica-Bold')
          .text(value, botRightX + botRightW * 0.55, ty, { width: botRightW * 0.42, align: 'right' });
        doc.rect(botRightX, ty - 2, botRightW, 14).stroke('#e0d9c8');
        ry += (highlight ? 16 : 14);
      };

      ry += 14;
      const savedRy = ry;
      totRow('Subtotal', fmt(data.subtotal));
      totRow(`IVA (16%)`, fmt(data.iva));
      totRow(`TOTAL ${data.moneda}`, fmt(data.total), true, true);
      ry = Math.max(ry, py) + 10;

      // Importe en letra
      doc.fillColor(C).fontSize(7.5).font('Helvetica-Bold')
        .text('Importe con letra: ', ML, ry, { continued: true });
      doc.fillColor(GRAY).font('Helvetica')
        .text(numeroALetras(data.total, data.moneda).toLowerCase()
          .replace(/^\w/, c => c.toUpperCase()), { width: W });
      ry = doc.y + 10;

      // ════════════════════════════════════════════════════════
      // CADENA ORIGINAL
      // ════════════════════════════════════════════════════════
      doc.rect(ML, ry, W, 12).fill('#e8e4da');
      doc.fillColor(G).fontSize(7.5).font('Helvetica-Bold')
        .text('CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACIÓN DIGITAL DEL SAT', ML + 4, ry + 3);
      ry += 14;

      const cadena = `||1.1|4317E07-3B94-4E59-8C0C-0963B5854B90|${fechaStr(data.fecha)}|MAR010101AAA|||${data.folio}||`;
      doc.rect(ML, ry, W, 28).fill('#f5f5f5');
      doc.fillColor(GRAY).fontSize(5.5).font('Helvetica')
        .text(cadena, ML + 4, ry + 4, { width: W - 8 });
      ry += 32;

      // Footer bar
      doc.rect(ML, ry, W, 3).fill(G);
      doc.fillColor(LGRAY).fontSize(6).font('Helvetica')
        .text('ESTE DOCUMENTO ES UNA REPRESENTACIÓN IMPRESA DE UN CFDI', ML, ry + 6, { width: W, align: 'center' });

      doc.end();
    });
  }
}
