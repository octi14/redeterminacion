const fs = require("fs");
const path = require("path");
const fontkit = require("@pdf-lib/fontkit");
const bwipjs = require("bwip-js");
const { PDFDocument, rgb } = require("pdf-lib");
const TasaPdfTemplate = require("./tasaPdfTemplate.service");
const { CONCEPTOS_URBANA } = require("./tasaBoletaDatos.service");

const COLUMN_WIDTH = 278;
const BLACK = rgb(0.08, 0.12, 0.11);
const FONT_REGULAR_PATH = path.join(__dirname, "..", "assets", "fonts", "DejaVuSansCondensed.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "..", "assets", "fonts", "DejaVuSansCondensed-Bold.ttf");

function texto(value) {
  return value == null ? "" : String(value).trim();
}

function fecha(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function dinero(centavos) {
  return `$ ${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((centavos || 0) / 100)}`;
}

function dineroConcepto(centavos) {
  return ((centavos || 0) / 100).toFixed(2);
}

function drawText(page, font, value, x, y, options = {}) {
  const size = options.size || 9;
  const maxWidth = options.maxWidth;
  let result = texto(value);
  if (!result) return;
  if (maxWidth) {
    while (result.length > 1 && font.widthOfTextAtSize(result, size) > maxWidth) {
      result = result.slice(0, -1);
    }
    if (result !== texto(value)) result = `${result.slice(0, -3)}...`;
  }
  page.drawText(result, { x, y, size, font, color: options.color || BLACK });
}

function drawRight(page, font, value, right, y, size = 9) {
  const result = texto(value);
  page.drawText(result, {
    x: right - font.widthOfTextAtSize(result, size),
    y,
    size,
    font,
    color: BLACK,
  });
}

function wrapLines(font, value, size, maxWidth) {
  const paragraphs = String(value || "").split("|").map((item) => item.trim()).filter(Boolean);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function barcodePng(value) {
  const text = texto(value);
  if (!text) return null;
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 2,
    height: 10,
    includetext: false,
    padding: 0,
  });
}

function conceptosDe(boleta) {
  const byIndex = new Map((boleta.conceptosCompactos || []).map(([codigo, importe]) => [codigo, importe]));
  return CONCEPTOS_URBANA.map((nombre, index) => ({
    nombre,
    importeCentavos: byIndex.has(index) ? byIndex.get(index) : 0,
  }));
}

function drawHeader(page, regular, bold, boleta) {
  const contribuyente = boleta.contribuyente || {};
  const objeto = boleta.objeto || {};
  const codigos = boleta.codigosPago || {};
  if (boleta.mensajeDeuda) {
    drawText(page, bold, boleta.mensajeDeuda, 195, 890, { size: 9, maxWidth: 390 });
  }
  drawText(page, regular, "Contribuyente:", 28, 870);
  drawText(page, bold, contribuyente.nombre, 98, 870, { maxWidth: 190 });
  drawText(page, regular, "Domicilio:", 28, 858);
  drawText(page, bold, contribuyente.domicilio, 78, 858, { maxWidth: 210 });
  drawText(page, regular, "Localidad:", 28, 846);
  drawText(page, bold, `${contribuyente.localidad || ""} ${contribuyente.codigoPostal ? `(${contribuyente.codigoPostal})` : ""}`, 78, 846, { maxWidth: 205 });
  drawText(page, regular, `Código Visa/Pago Mis Cuentas: ${codigos.pagoMisCuentas || "-"}`, 28, 828, { size: 8.5 });
  drawText(page, regular, `Código Link Pagos: ${codigos.redLink || "-"}`, 28, 816, { size: 8.5 });

  drawText(page, regular, "Datos Catastrales", 306, 870);
  drawText(page, regular, objeto.catastro || "-", 306, 858, { maxWidth: 270 });
  drawText(page, regular, `Nro. de Cuenta: ${boleta.partida}`, 306, 846);
  drawText(page, regular, `Zona: ${objeto.zona || "-"}`, 306, 834);
  drawText(page, regular, `Mts. 2 Const.: ${objeto.metrosConstruidos == null ? "-" : objeto.metrosConstruidos}`, 306, 822);

  const messageLines = wrapLines(regular, boleta.mensajeBoleta, 8.2, 560).slice(0, 6);
  messageLines.forEach((line, index) => {
    drawText(page, regular, line, 28, 786 - index * 10, { size: 8.2 });
  });
}

function drawRun(page, x, y, size, segments) {
  let cursor = x;
  for (const segment of segments) {
    const text = segment.text == null ? "" : String(segment.text);
    if (!text) continue;
    page.drawText(text, { x: cursor, y, size, font: segment.font, color: BLACK });
    cursor += segment.font.widthOfTextAtSize(text, size);
  }
}

function drawPeriodSummary(page, regular, bold, boleta, column) {
  const x = column === 0 ? 28 : 306;
  const right = x + 262;
  const first = (boleta.vencimientos || []).find((item) => item.orden === 1) || {};
  const second = (boleta.vencimientos || []).find((item) => item.orden === 2) || {};
  drawRun(page, x, 695, 9.2, [
    { font: regular, text: "Cuota Nº:  " },
    { font: bold, text: String(boleta.cuota).padStart(2, "0") },
    { font: regular, text: " | Año:  " },
    { font: bold, text: String(boleta.anio) },
  ]);
  drawRun(page, x, 683, 9.2, [
    { font: regular, text: "Cuenta Nº:  " },
    { font: bold, text: String(boleta.partida || "") },
    { font: regular, text: " | Recibo Nr.:  " },
    { font: bold, text: boleta.recibo || "-" },
  ]);
  const retroactivoDesde = 11;
  conceptosDe(boleta).forEach((concepto, index) => {
    const y = 671 - index * 11 - (index >= retroactivoDesde ? 16 : 0);
    drawText(page, regular, concepto.nombre, x, y, { size: 9.5, maxWidth: 175 });
    if (!(concepto.nombre === "Retroactivo" && !concepto.importeCentavos)) {
      drawRight(page, regular, dineroConcepto(concepto.importeCentavos), right, y, 9.5);
    }
  });
  drawText(page, regular, "TOTAL AL 1º VENCIMIENTO", x, 425);
  drawText(page, regular, fecha(first.fecha), x + 145, 425);
  drawRight(page, regular, dineroConcepto(first.importeCentavos), right, 425);
  drawText(page, regular, "TOTAL AL 2º VENCIMIENTO", x, 411);
  drawText(page, regular, fecha(second.fecha), x + 145, 411);
  drawRight(page, regular, dineroConcepto(second.importeCentavos), right, 411);
}

async function drawTalon(page, pdf, regular, bold, boleta, column, vencimiento, upper) {
  if (!vencimiento) return;
  const x = column === 0 ? 28 : 334;
  const titleX = column === 0 ? 58 : 364;
  const centerX = column === 0 ? 167 : 473;
  const layout = upper
    ? { titleY: 320, nameY: 294, barcodeY: 257, detailY: 228, barcodeHeight: 28 }
    : { titleY: 136, nameY: 111, barcodeY: 75, detailY: 45, barcodeHeight: 26 };
  const png = await barcodePng(vencimiento.codigoBarra);
  const name = texto((boleta.contribuyente || {}).nombre);
  drawText(page, bold, `Talón ${vencimiento.orden === 1 ? "1er" : "2do"}. Vencimiento`, titleX, layout.titleY, { size: 10.5 });
  drawText(page, bold, name, centerX - Math.min(110, bold.widthOfTextAtSize(name, 10.5) / 2), layout.nameY, { size: 10.5, maxWidth: 220 });
  if (png) {
    const barcode = await pdf.embedPng(png);
    const barcodeWidth = Math.min(218, barcode.width * (layout.barcodeHeight / barcode.height));
    page.drawImage(barcode, { x: centerX - barcodeWidth / 2, y: layout.barcodeY, width: barcodeWidth, height: layout.barcodeHeight });
    drawText(page, regular, vencimiento.codigoBarra, centerX - 109, layout.barcodeY - 6, { size: 6.2, maxWidth: 218 });
  }
  drawText(page, bold, `Tasas Urbanas Cuota: ${boleta.periodo}`, x, layout.detailY, { size: 8.8 });
  drawText(page, regular, `Total al ${vencimiento.orden === 1 ? "1er" : "2do"} Vto.: ${fecha(vencimiento.fecha)}  ${dinero(vencimiento.importeCentavos)}`, x, layout.detailY - 10, { size: 8.3, maxWidth: 260 });
  drawText(page, regular, `Cuenta Nro. ${boleta.partida}   Comprobante N:${boleta.recibo || "-"}`, x, layout.detailY - 20, { size: 8.3, maxWidth: 260 });
}

exports.generar = async function generar(boletas) {
  const output = await PDFDocument.create();
  output.registerFontkit(fontkit);
  const regular = await output.embedFont(fs.readFileSync(FONT_REGULAR_PATH));
  const bold = await output.embedFont(fs.readFileSync(FONT_BOLD_PATH));

  for (let index = 0; index < boletas.length; index += 2) {
    const page = await TasaPdfTemplate.crearPagina(output, "URBANA");
    const pair = boletas.slice(index, index + 2);
    drawHeader(page, regular, bold, pair[0]);
    for (let column = 0; column < pair.length; column += 1) {
      const boleta = pair[column];
      drawPeriodSummary(page, regular, bold, boleta, column);
      await drawTalon(page, output, regular, bold, boleta, column, (boleta.vencimientos || []).find((item) => item.orden === 1), true);
      await drawTalon(page, output, regular, bold, boleta, column, (boleta.vencimientos || []).find((item) => item.orden === 2), false);
    }
  }

  return Buffer.from(await output.save());
};
