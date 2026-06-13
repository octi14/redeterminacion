const fs = require("fs");
const path = require("path");
const bwipjs = require("bwip-js");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const TEMPLATE_PATH = path.join(__dirname, "..", "assets", "tasa-automotor-template-2026.pdf");
const PAGE_WIDTH = 612;
const COLUMN_WIDTH = 278;
const BLACK = rgb(0.08, 0.12, 0.11);

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

async function barcodePng(value) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: texto(value),
    scale: 2,
    height: 10,
    includetext: false,
    padding: 0,
  });
}

function drawHeader(page, regular, bold, boleta) {
  if (boleta.mensajeDeuda) {
    drawText(page, bold, boleta.mensajeDeuda, 195, 885, { size: 9, maxWidth: 390 });
  }
  drawText(page, bold, "Contribuyente:", 28, 870);
  drawText(page, regular, boleta.contribuyente.nombre, 92, 870, { maxWidth: 190 });
  drawText(page, bold, "Domicilio:", 28, 858);
  drawText(page, regular, boleta.contribuyente.domicilio, 72, 858, { maxWidth: 210 });
  drawText(page, bold, "Localidad:", 28, 846);
  drawText(page, regular, `${boleta.contribuyente.localidad} ${boleta.contribuyente.codigoPostal || ""}`, 73, 846, { maxWidth: 205 });
  drawText(page, regular, `Código Pago Mis Cuentas: ${boleta.codigosPago.pagoMisCuentas || "-"}`, 28, 822, { size: 8.5 });
  drawText(page, regular, `Código Link Pagos: ${boleta.codigosPago.redLink || "-"}`, 28, 810, { size: 8.5 });

  drawText(page, bold, "Datos del vehículo", 306, 870);
  drawText(page, regular, `Dominio: ${boleta.objeto.dominio}`, 306, 858);
  drawText(page, regular, `Marca: ${boleta.objeto.marca || "-"}`, 306, 846, { maxWidth: 270 });
  drawText(page, regular, `Modelo: ${boleta.objeto.modelo || "-"} (${boleta.objeto.anioModelo || "-"})`, 306, 834, { maxWidth: 270 });
  drawText(page, regular, `Categoría: ${boleta.objeto.categoria || "-"}`, 306, 822, { maxWidth: 270 });

  drawText(page, bold, "Sr. Contribuyente:", 28, 787, { size: 8.5 });
  drawText(page, regular, "Conserve esta boleta como comprobante. Puede abonarla utilizando los códigos de pago", 28, 776, { size: 8.2 });
  drawText(page, regular, "indicados o presentando el talón correspondiente al vencimiento elegido.", 28, 765, { size: 8.2 });
  drawText(page, regular, "Municipalidad de Villa Gesell - Departamento de Recaudaciones.", 28, 754, { size: 8.2 });
}

function drawPeriodSummary(page, regular, bold, boleta, column) {
  const x = column === 0 ? 28 : 306;
  const right = x + 250;
  const first = boleta.vencimientos.find((item) => item.orden === 1) || {};
  const second = boleta.vencimientos.find((item) => item.orden === 2) || {};

  drawText(page, bold, `Cuota N°: ${String(boleta.cuota).padStart(2, "0")} | Año: ${boleta.anio}`, x, 681);
  drawText(page, regular, `Dominio: ${boleta.objeto.dominio} | Recibo N°: ${boleta.recibo || "-"}`, x, 669, { maxWidth: COLUMN_WIDTH - 10 });
  drawText(page, regular, "Tasa Automotor", x, 646);
  drawRight(page, regular, dinero(boleta.importeCentavos), right, 646);
  drawText(page, regular, `Marca: ${boleta.objeto.marca || "-"}`, x, 622, { maxWidth: COLUMN_WIDTH - 10 });
  drawText(page, regular, `Modelo: ${boleta.objeto.modelo || "-"}`, x, 610, { maxWidth: COLUMN_WIDTH - 10 });
  drawText(page, regular, `Año modelo: ${boleta.objeto.anioModelo || "-"}`, x, 598);
  drawText(page, regular, `Categoría: ${boleta.objeto.categoria || "-"}`, x, 586, { maxWidth: COLUMN_WIDTH - 10 });
  drawText(page, bold, "TOTAL AL 1° VENCIMIENTO", x, 418);
  drawText(page, regular, fecha(first.fecha), x + 145, 418);
  drawRight(page, bold, dinero(first.importeCentavos), right, 418);
  drawText(page, bold, "TOTAL AL 2° VENCIMIENTO", x, 406);
  drawText(page, regular, fecha(second.fecha), x + 145, 406);
  drawRight(page, bold, dinero(second.importeCentavos), right, 406);
}

async function drawTalon(page, pdf, regular, bold, boleta, column, vencimiento, upper) {
  if (!vencimiento) return;
  const x = column === 0 ? 28 : 334;
  const centerX = column === 0 ? 167 : 473;
  const nameY = upper ? 290 : 136;
  const barcodeY = upper ? 250 : 96;
  const detailY = upper ? 233 : 80;
  const titleY = upper ? 187 : 33;
  const barcode = await pdf.embedPng(await barcodePng(vencimiento.codigoBarra));
  const barcodeWidth = Math.min(225, barcode.width * (34 / barcode.height));

  const name = texto(boleta.contribuyente.nombre);
  drawText(page, bold, name, centerX - Math.min(110, bold.widthOfTextAtSize(name, 10.5) / 2), nameY, { size: 10.5, maxWidth: 220 });
  page.drawImage(barcode, { x: centerX - barcodeWidth / 2, y: barcodeY, width: barcodeWidth, height: 34 });
  drawText(page, regular, vencimiento.codigoBarra, centerX - 112, barcodeY - 8, { size: 6.5, maxWidth: 224 });
  drawText(page, bold, `Tasa Automotor Cuota: ${boleta.periodo}`, x, detailY);
  drawText(page, regular, `Total al ${vencimiento.orden === 1 ? "1er" : "2do"} Vto.: ${fecha(vencimiento.fecha)}  ${dinero(vencimiento.importeCentavos)}`, x, detailY - 12, { maxWidth: 260 });
  drawText(page, regular, `Dominio: ${boleta.objeto.dominio}   Comprobante N°: ${boleta.recibo || "-"}`, x, detailY - 24, { maxWidth: 260 });
  drawText(page, bold, `Talón ${vencimiento.orden === 1 ? "1er" : "2do"}. Vencimiento`, x, titleY, { size: 12 });
}

exports.generar = async function generar(boletas) {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const template = await PDFDocument.load(templateBytes);
  const output = await PDFDocument.create();
  const regular = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);

  for (let index = 0; index < boletas.length; index += 2) {
    const [background] = await output.copyPages(template, [0]);
    output.addPage(background);
    const page = output.getPages()[output.getPageCount() - 1];
    page.setSize(PAGE_WIDTH, 1008);
    const pair = boletas.slice(index, index + 2);
    drawHeader(page, regular, bold, pair[0]);
    for (let column = 0; column < pair.length; column += 1) {
      const boleta = pair[column];
      drawPeriodSummary(page, regular, bold, boleta, column);
      await drawTalon(page, output, regular, bold, boleta, column, boleta.vencimientos.find((item) => item.orden === 1), true);
      await drawTalon(page, output, regular, bold, boleta, column, boleta.vencimientos.find((item) => item.orden === 2), false);
    }
  }

  return Buffer.from(await output.save());
};
