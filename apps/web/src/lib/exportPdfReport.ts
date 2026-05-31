import type { VentasAnalytics } from "@/hooks/useVentasData";

// ── Paleta ─────────────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const GREEN:      RGB = [61, 122, 79];
const GREEN_LT:   RGB = [220, 237, 224];
const TEXT_DARK:  RGB = [44,  44,  42];
const TEXT_MUTED: RGB = [136, 135, 128];
const WHITE:      RGB = [255, 255, 255];
const BG_EVEN:    RGB = [248, 248, 246];
const BG_MUTED:   RGB = [240, 240, 238];
const BG_TOTAL:   RGB = [235, 244, 238];
const BORDER_ROW: RGB = [220, 220, 218];

// ── Página ─────────────────────────────────────────────────────────────────────
const PW = 210;
const PH = 297;
const M  = 20;
const CW = PW - M * 2; // 170mm

const MONTHS_ES  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_CAP = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export interface ExportPdfOptions {
  producerName: string;
  producerPhoto?: string | null;
  salesData:    VentasAnalytics | null;
  productsData: VentasAnalytics | null;
  ventasChartEl:    HTMLElement | null;
  productosChartEl: HTMLElement | null;
}

export async function exportPdfReport(opts: ExportPdfOptions): Promise<void> {
  const { jsPDF }             = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const { producerName, producerPhoto, salesData, productsData } = opts;
  const pdf = new jsPDF("p", "mm", "a4");

  // ── Helpers de color ─────────────────────────────────────────────────────────
  const st  = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const sf  = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const sd  = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
  const bold   = () => pdf.setFont("helvetica", "bold");
  const normal = () => pdf.setFont("helvetica", "normal");
  const sz = (n: number) => pdf.setFontSize(n);

  // ── Fecha ─────────────────────────────────────────────────────────────────────
  const now   = new Date();
  const yr    = now.getFullYear();
  const mo    = now.getMonth();
  const label = `${MONTHS_CAP[mo]} ${yr}`;
  const fechaGen = now.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  // ── Métricas ──────────────────────────────────────────────────────────────────
  const ventas   = salesData?.ventas ?? [];
  const productos = [...(productsData?.productos ?? salesData?.productos ?? [])].sort((a,b) => b.y - a.y);

  const totalVentas  = ventas.reduce((s, r) => s + r.y, 0);
  const totalUnits   = productos.reduce((s, p) => s + p.y, 0);
  const noSaleDays   = ventas.filter(r => r.y === 0).length;
  const activeDays   = ventas.length - noSaleDays;
  const avgDiario    = ventas.length > 0 ? totalVentas / ventas.length : 0;
  const peakDay      = ventas.length > 0 ? ventas.reduce((a, b) => b.y > a.y ? b : a) : null;
  const topProduct   = productos[0] ?? null;
  const topPct       = totalUnits > 0 && topProduct ? Math.round(topProduct.y / totalUnits * 100) : 0;
  const top2Pct      = totalUnits > 0 && productos.length >= 2
    ? Math.round((productos[0].y + productos[1].y) / totalUnits * 100) : topPct;

  // ── Nombre de archivo ─────────────────────────────────────────────────────────
  const slug = producerName.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const fileName = `reporte-${slug}-${MONTHS_ES[mo]}-${yr}.pdf`;

  // ── Formatters ────────────────────────────────────────────────────────────────
  const fmtMXN = (v: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

  const fmtDate = (x: string) => {
    const iso = x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) { const d = new Date(`${x}T12:00:00`); return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`; }
    const sl = x.match(/^(\d+)\/(\d+)$/);
    if (sl) return `${sl[1]} ${MONTHS_ES[parseInt(sl[2]) - 1] ?? ""}`.trim();
    return x;
  };

  // ── Carga logo ────────────────────────────────────────────────────────────────
  let logoUrl: string | null = null;
  if (producerPhoto) {
    try {
      const res  = await fetch(producerPhoto);
      const blob = await res.blob();
      logoUrl = await new Promise<string>(resolve => {
        const rd = new FileReader();
        rd.onloadend = () => resolve(rd.result as string);
        rd.onerror   = () => resolve("");
        rd.readAsDataURL(blob);
      });
      if (!logoUrl) logoUrl = null;
    } catch { logoUrl = null; }
  }

  // ── Captura gráficas ──────────────────────────────────────────────────────────
  const captureEl = async (el: HTMLElement | null): Promise<string | null> => {
    if (!el) return null;
    const c = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
    return c.toDataURL("image/png");
  };
  const ventasImg    = await captureEl(opts.ventasChartEl);
  const productosImg = await captureEl(opts.productosChartEl);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS DE DIBUJO
  // ═══════════════════════════════════════════════════════════════════════════════

  // Header repetido en páginas 2–N
  function drawHeader(): number {
    sf(GREEN); pdf.rect(0, 0, PW, 14, "F");
    let nx = M;
    if (logoUrl) { try { pdf.addImage(logoUrl, "JPEG", M, 2, 10, 10); nx = M + 13; } catch {} }
    bold(); sz(9); st(WHITE);
    const pnClip = producerName.length > 45 ? producerName.slice(0, 43) + "…" : producerName;
    pdf.text(pnClip, nx, 9);
    normal(); st(WHITE);
    pdf.text(label, PW - M, 9, { align: "right" });
    return 20;
  }

  // Título de sección con barra verde lateral
  function sectionTitle(text: string, y: number): number {
    sf(GREEN); pdf.rect(M, y, 3, 8, "F");
    bold(); sz(13); st(GREEN);
    pdf.text(text, M + 6, y + 6.5);
    return y + 13;
  }

  // 4 tarjetas métricas en una fila
  function metricRow(cards: { lbl: string; val: string; sub?: string }[], y: number): number {
    const cW = CW / cards.length;
    cards.forEach((c, i) => {
      const x = M + i * cW;
      sf(GREEN_LT); pdf.roundedRect(x + 1, y, cW - 2, 21, 2, 2, "F");
      normal(); sz(7); st(TEXT_MUTED); pdf.text(c.lbl.toUpperCase(), x + 4, y + 6);
      bold(); sz(11); st(GREEN); pdf.text(c.val, x + 4, y + 13.5);
      if (c.sub) {
        normal(); sz(7); st(TEXT_MUTED);
        const mx = Math.floor((cW - 8) / 1.9);
        pdf.text(c.sub.length > mx ? c.sub.slice(0, mx - 1) + "…" : c.sub, x + 4, y + 18.5);
      }
    });
    return y + 25;
  }

  // Caja de observaciones automáticas
  function obsBox(title: string, lines: string[], y: number): number {
    const splits = lines.flatMap(l => (pdf.splitTextToSize(l, CW - 12) as string[]));
    const bH = 10 + splits.length * 6 + 4;
    sf(BG_EVEN); pdf.roundedRect(M, y, CW, bH, 2, 2, "F");
    sd(GREEN); pdf.setLineWidth(0.5);
    pdf.line(M + 1, y + 1, M + 1, y + bH - 1);
    bold(); sz(9); st(TEXT_DARK); pdf.text(title, M + 5, y + 7);
    normal(); sz(8.5); st(TEXT_DARK);
    splits.forEach((l, i) => pdf.text(l, M + 5, y + 14 + i * 6));
    return y + bH + 4;
  }

  // Tabla genérica
  function drawTable(
    headers: string[],
    rows: Array<{ cells: string[]; muted?: boolean; bold?: boolean }>,
    colW: number[],
    y: number,
    rH = 6,
  ): number {
    const tW = colW.reduce((a, b) => a + b, 0);
    sf(GREEN); pdf.rect(M, y, tW, rH + 1, "F");
    bold(); sz(8); st(WHITE);
    let x = M;
    headers.forEach((h, i) => { pdf.text(h, x + 2, y + rH - 1); x += colW[i]; });
    y += rH + 1;

    rows.forEach((row, idx) => {
      if (y + rH > PH - 22) return;
      if (row.muted)      sf(BG_MUTED);
      else if (row.bold)  sf(BG_TOTAL);
      else if (idx % 2 === 1) sf(BG_EVEN);
      else                sf(WHITE);
      pdf.rect(M, y, tW, rH, "F");

      pdf.setFont("helvetica", row.bold ? "bold" : "normal"); sz(7.5);
      st(row.muted ? TEXT_MUTED : TEXT_DARK);
      x = M;
      row.cells.forEach((cell, i) => {
        const max = Math.floor(colW[i] / 1.9);
        pdf.text(cell.length > max ? cell.slice(0, max - 1) + "…" : cell, x + 2, y + rH - 1.5);
        x += colW[i];
      });
      sd(BORDER_ROW); pdf.setLineWidth(0.1);
      pdf.line(M, y + rH, M + tW, y + rH);
      y += rH;
    });
    return y;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — Portada
  // ═══════════════════════════════════════════════════════════════════════════════
  sf(GREEN); pdf.rect(0, 0, PW, 10, "F");

  const cy = PH / 2 - 45;
  if (logoUrl) {
    try { pdf.addImage(logoUrl, "JPEG", PW / 2 - 20, cy - 20, 40, 40); } catch {}
  } else {
    const cx = PW / 2;
    sf(GREEN_LT); pdf.roundedRect(cx - 22, cy - 22, 44, 44, 22, 22, "F");
    sf(GREEN);    pdf.roundedRect(cx - 20, cy - 20, 40, 40, 20, 20, "F");
    const ini = producerName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
    bold(); sz(20); st(WHITE); pdf.text(ini, cx, cy + 4, { align: "center" });
  }

  bold(); sz(22); st(TEXT_DARK); pdf.text(producerName, PW / 2, cy + 38, { align: "center" });
  sd(GREEN); pdf.setLineWidth(1.5);
  pdf.line(PW / 2 - 35, cy + 44, PW / 2 + 35, cy + 44);

  bold(); sz(17); st(GREEN); pdf.text("Reporte de Ventas", PW / 2, cy + 56, { align: "center" });
  normal(); sz(13); st(TEXT_DARK); pdf.text(label, PW / 2, cy + 68, { align: "center" });
  sz(9); st(TEXT_MUTED); pdf.text(`Generado el ${fechaGen}`, PW / 2, cy + 78, { align: "center" });

  sf(GREEN); pdf.rect(0, PH - 10, PW, 10, "F");
  normal(); sz(8); st(WHITE);
  pdf.text("Reporte confidencial · Uso interno", PW / 2, PH - 4, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — Resumen ejecutivo
  // ═══════════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  let y = drawHeader();
  y = sectionTitle("Resumen del período", y);

  y = metricRow([
    { lbl: "Total vendido",   val: fmtMXN(totalVentas) },
    { lbl: "Total unidades",  val: String(totalUnits),  sub: `${activeDays} días activos` },
    { lbl: "Promedio diario", val: fmtMXN(avgDiario) },
    { lbl: "Días sin ventas", val: String(noSaleDays),  sub: `de ${ventas.length} días` },
  ], y);
  y += 3;

  // Dos tarjetas medianas
  const hw = CW / 2;
  const pnShort = (topProduct?.x ?? "—").length > 30 ? (topProduct?.x ?? "").slice(0, 28) + "…" : (topProduct?.x ?? "—");

  sf(GREEN_LT); pdf.roundedRect(M + 1, y, hw - 2, 21, 2, 2, "F");
  normal(); sz(7); st(TEXT_MUTED); pdf.text("DÍA PICO", M + 4, y + 6);
  bold(); sz(11); st(GREEN); pdf.text(peakDay ? fmtMXN(peakDay.y) : "—", M + 4, y + 13.5);
  normal(); sz(7); st(TEXT_MUTED); pdf.text(peakDay ? fmtDate(peakDay.x) : "", M + 4, y + 18.5);

  sf(GREEN_LT); pdf.roundedRect(M + hw + 1, y, hw - 2, 21, 2, 2, "F");
  normal(); sz(7); st(TEXT_MUTED); pdf.text("PRODUCTO MÁS VENDIDO", M + hw + 4, y + 6);
  bold(); sz(10); st(GREEN); pdf.text(pnShort, M + hw + 4, y + 13.5);
  normal(); sz(7); st(TEXT_MUTED);
  pdf.text(topProduct ? `${topProduct.y} uds. · ${topPct}% del total` : "", M + hw + 4, y + 18.5);
  y += 26;

  normal(); sz(8); st(TEXT_DARK);
  pdf.text(`Días activos: ${activeDays}  ·  Top 2 productos concentran el ${top2Pct}% del volumen`, M, y + 4);
  y += 10;

  const obsP2: string[] = [];
  if (peakDay) obsP2.push(`El día con mayor venta fue ${fmtDate(peakDay.x)} con ${fmtMXN(peakDay.y)}.`);
  if (noSaleDays > 0) obsP2.push(`El ${Math.round(noSaleDays / ventas.length * 100)}% de los días no registraron ventas (${noSaleDays} de ${ventas.length}).`);
  if (topProduct) obsP2.push(`Producto líder: "${pnShort}" con ${topProduct.y} uds. (${topPct}% del total).`);
  if (obsP2.length) obsBox("Observaciones del período:", obsP2, y);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 3 — Gráfica de ventas
  // ═══════════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = drawHeader();
  y = sectionTitle("Evolución de ventas diarias", y);

  if (ventasImg) {
    const ip = pdf.getImageProperties(ventasImg);
    const ih = Math.min(CW / (ip.width / ip.height), 110);
    pdf.addImage(ventasImg, "PNG", M, y, CW, ih);
    y += ih + 6;
  } else {
    sz(9); st(TEXT_MUTED); pdf.text("Gráfica no disponible", M, y + 10); y += 18;
  }

  const vObs = [
    peakDay ? `El día con mayor venta fue ${fmtDate(peakDay.x)} con ${fmtMXN(peakDay.y)}.` : "No se registraron ventas.",
    ventas.length > 0 ? `Promedio diario de ${fmtMXN(avgDiario)}. El ${Math.round(noSaleDays / ventas.length * 100)}% de los días (${noSaleDays}) no registraron actividad.` : "",
  ].filter(Boolean);
  obsBox("Análisis automático:", vObs, y);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 4 — Gráfica de productos
  // ═══════════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = drawHeader();
  y = sectionTitle("Ranking de productos por volumen", y);

  if (productosImg) {
    const ip = pdf.getImageProperties(productosImg);
    const ih = Math.min(CW / (ip.width / ip.height), 120);
    pdf.addImage(productosImg, "PNG", M, y, CW, ih);
    y += ih + 6;
  } else {
    sz(9); st(TEXT_MUTED); pdf.text("Gráfica no disponible", M, y + 10); y += 18;
  }

  const pObs = [
    topProduct ? `El producto líder "${pnShort}" registró ${topProduct.y} unidades (${topPct}% del total).` : "Sin datos de productos.",
    productos.length >= 2 ? `Los 2 productos de mayor rotación concentran el ${top2Pct}% del volumen del período.` : "",
  ].filter(Boolean);
  obsBox("Análisis automático:", pObs, y);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 5 — Tablas de detalle
  // ═══════════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = drawHeader();
  y = sectionTitle("Ventas por día", y);

  const vRows: Array<{ cells: string[]; muted?: boolean; bold?: boolean }> = ventas.map((r, i) => {
    const prev = i > 0 ? ventas[i - 1].y : null;
    let var_ = "—";
    if (prev !== null && r.y > 0 && prev > 0) {
      const d = ((r.y - prev) / prev * 100).toFixed(0);
      var_ = `${Number(d) >= 0 ? "+" : ""}${d}%`;
    } else if (prev !== null && r.y > 0 && prev === 0) {
      var_ = "Nueva";
    }
    return { cells: [fmtDate(r.x), fmtMXN(r.y), var_], muted: r.y === 0 };
  });
  vRows.push({ cells: ["Total", fmtMXN(totalVentas), ""], bold: true });

  y = drawTable(["Fecha", "Monto vendido (MXN)", "Variación vs anterior"], vRows, [50, 60, 60], y);
  y += 6;

  // ¿Cabe tabla de productos?
  const prodNeedH = 13 + 7 + (productos.length + 1) * 6;
  if (y + prodNeedH > PH - 22) {
    pdf.addPage();
    y = drawHeader();
  }
  y = sectionTitle("Detalle de productos", y);

  const pRows: Array<{ cells: string[]; muted?: boolean; bold?: boolean }> = productos.map(p => {
    const pct  = totalUnits > 0 ? Math.round(p.y / totalUnits * 100) : 0;
    const unit = p.y > 0 && p.monto > 0 ? Math.round(p.monto / p.y) : 0;
    return { cells: [p.x, String(p.y), `${pct}%`, unit > 0 ? fmtMXN(unit) : "—", p.monto > 0 ? fmtMXN(p.monto) : "—"] };
  });
  pRows.push({ cells: ["Total", String(totalUnits), "100%", "", fmtMXN(totalVentas)], bold: true });

  drawTable(["Producto", "Unidades", "% Total", "Precio unit.", "Ingreso total"], pRows, [62, 22, 20, 32, 34], y);

  // ═══════════════════════════════════════════════════════════════════════════════
  // FOOTERS — pase final (ya conocemos totalPages)
  // ═══════════════════════════════════════════════════════════════════════════════
  const totalPages = pdf.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    const fy = PH - 10;
    sd(GREEN); pdf.setLineWidth(0.3);
    pdf.line(M, fy - 4, PW - M, fy - 4);
    normal(); sz(8); st(TEXT_MUTED);
    if (p > 1) pdf.text(producerName, M, fy);
    pdf.text(`${p} / ${totalPages}`, PW - M, fy, { align: "right" });
  }

  pdf.save(fileName);
}
