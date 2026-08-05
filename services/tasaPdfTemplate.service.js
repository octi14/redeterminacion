const fs = require("fs");
const path = require("path");
const { rgb, StandardFonts } = require("pdf-lib");
const TasaCatalogo = require("./tasaCatalogo.service");

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 1008;
const AUTOMOTOR_BG_PATH = path.join(__dirname, "..", "assets", "tasa-automotor-bg-2026.jpg");

function colorHex(hex) {
  const value = String(hex || "#13875e").replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

function linea(page, x1, y1, x2, y2, color, thickness = 0.7) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

async function crearPagina(pdf, tipoTasa) {
  const tasa = TasaCatalogo.requerir(tipoTasa);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  if (tasa.codigo === "AUTOMOTORES" && fs.existsSync(AUTOMOTOR_BG_PATH)) {
    const background = await pdf.embedJpg(fs.readFileSync(AUTOMOTOR_BG_PATH));
    page.drawImage(background, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
    return page;
  }

  const principal = colorHex(tasa.tema.principal);
  const oscuro = colorHex(tasa.tema.oscuro);
  const suave = colorHex(tasa.tema.suave);
  const gris = rgb(0.72, 0.76, 0.74);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: 905, width: PAGE_WIDTH, height: 103, color: oscuro });
  page.drawRectangle({ x: 0, y: 894, width: PAGE_WIDTH, height: 11, color: principal });
  page.drawText("VILLA GESELL", { x: 28, y: 958, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText("MUNICIPALIDAD", { x: 28, y: 943, size: 8, font: bold, color: suave });
  page.drawText(tasa.nombre.toUpperCase(), { x: 430, y: 952, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("BOLETA DE PAGO 2026", { x: 430, y: 936, size: 8, font: bold, color: suave });

  page.drawRectangle({ x: 18, y: 738, width: 576, height: 148, borderColor: principal, borderWidth: 1.1 });
  page.drawRectangle({ x: 18, y: 695, width: 576, height: 31, color: suave });
  linea(page, 300, 395, 300, 726, gris);
  linea(page, 18, 395, 594, 395, principal, 1.2);

  for (const y of [181, 27]) {
    page.drawRectangle({ x: 18, y, width: 576, height: 145, borderColor: principal, borderWidth: 1 });
    linea(page, 306, y, 306, y + 145, gris);
    page.drawRectangle({ x: 18, y, width: 576, height: 24, color: suave });
  }
  linea(page, 18, 338, 594, 338, principal, 1.2);
  page.drawText("Municipalidad de Villa Gesell - Departamento de Recaudaciones", {
    x: 174, y: 8, size: 6.5, font: bold, color: principal,
  });
  return page;
}

module.exports = { crearPagina, colorHex, PAGE_WIDTH, PAGE_HEIGHT };
