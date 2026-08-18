/**
 * Smoke tests del flujo urbana/PN SIN crear pago en Provincia NET.
 * Uso: node scripts/smoke-provincia-net-sin-pago.js
 */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const config = require("../config");
const DeudaPagoService = require("../services/deudaPago.service");
const TasaUrbanaImportacionService = require("../services/tasaUrbanaImportacion.service");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");
const TasaBoleta = require("../models/tasaBoleta.model");

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:5000";
const PARTIDA = "SMOKETEST01";
const YEAR = new Date().getFullYear();
const MONTH = Math.max(1, new Date().getMonth() + 1);

let passed = 0;
let failed = 0;

function log(name, ok, extra = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? ` - ${extra}` : ""}`);
  if (ok) passed += 1;
  else failed += 1;
}

async function crearXlsxTemporal() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Urbana");
  sheet.addRow([
    "Titular",
    "Partida",
    "Catastro",
    "Mes",
    "Año",
    "Recibo",
    "$1erVto",
    "$2doVto",
    "F-1erVto",
    "F-2doVto",
    "CodBarra-1erVto",
    "CodBarra-2doVto",
    "Banelco",
    "RedLink",
    "Domicilio",
    "Localidad",
    "C.P.",
  ]);
  sheet.addRow([
    "SMOKE TEST URBANA",
    PARTIDA,
    "CAT-SMOKE",
    MONTH,
    YEAR,
    "R-SMOKE-1",
    1234.56,
    1300.0,
    `15/${String(MONTH).padStart(2, "0")}/${YEAR}`,
    `28/${String(MONTH).padStart(2, "0")}/${YEAR}`,
    "77900000000000000000000000000000000000000001",
    "77900000000000000000000000000000000000000002",
    "PMC123",
    "RL123",
    "CALLE FALSA 123",
    "VILLA GESELL",
    "7165",
  ]);
  const filePath = path.join(os.tmpdir(), `smoke-urbana-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

(async () => {
  const host = (config.MONGO_URL.match(/@([^/]+)/) || [])[1];
  const db = (config.MONGO_URL.match(/\.net\/([^?]+)/) || [])[1];
  log("db_is_test", /test/i.test(db || ""), `${db} @ ${host}`);
  if (!/test/i.test(db || "")) {
    console.error("ABORT: no smoke sobre DB de produccion");
    process.exit(2);
  }

  await mongoose.connect(config.MONGO_URL);

  // 1) HTTP config (sin auth)
  try {
    const res = await fetch(`${BASE}/pagos/provincia-net/configuracion`);
    const body = await res.json();
    log(
      "http_configuracion",
      res.status === 200 && typeof body?.data?.habilitada === "boolean",
      `status=${res.status} habilitada=${body?.data?.habilitada}`
    );
  } catch (e) {
    log("http_configuracion", false, e.message);
  }

  // 2) Toggle config service (sin PN)
  const before = await DeudaPagoService.pagoTasaUrbanaPublicoHabilitado();
  try {
    await DeudaPagoService.actualizarPagoTasaUrbanaPublico(!before);
    const mid = await DeudaPagoService.pagoTasaUrbanaPublicoHabilitado();
    log("config_toggle", mid === !before, `was=${before} now=${mid}`);
  } catch (e) {
    log("config_toggle", false, e.message);
  } finally {
    await DeudaPagoService.actualizarPagoTasaUrbanaPublico(before);
    const restored = await DeudaPagoService.pagoTasaUrbanaPublicoHabilitado();
    log("config_restore", restored === before, `value=${restored}`);
  }

  // 3) Import XLSX → tasaurbanadeudas
  let filePath;
  try {
    await TasaUrbanaDeuda.deleteMany({ partida: PARTIDA });
    filePath = await crearXlsxTemporal();
    const imported = await TasaUrbanaImportacionService.importarArchivo({
      filePath,
      fileName: "smoke-urbana.xlsx",
    });
    log(
      "import_urbana_xlsx",
      imported.cantidadImportadas >= 1,
      `importadas=${imported.cantidadImportadas} partidas=${imported.cantidadObjetos}`
    );
  } catch (e) {
    log("import_urbana_xlsx", false, e.message);
  } finally {
    if (filePath) fs.promises.unlink(filePath).catch(() => {});
  }

  // 4) Resolver deuda urbana
  let deuda;
  try {
    deuda = await DeudaPagoService.resolverDeuda({
      tipoTasa: "URBANA",
      objetoClave: PARTIDA,
    });
    log(
      "resolver_deuda_urbana",
      deuda?.items?.length >= 1 && deuda.objetoClave === PARTIDA,
      `items=${deuda?.items?.length} saldo=${deuda?.saldo}`
    );
  } catch (e) {
    log("resolver_deuda_urbana", false, e.message);
  }

  // 5) HTTP deuda (puede 403 si público off y sin token; con público on debería 200)
  try {
    await DeudaPagoService.actualizarPagoTasaUrbanaPublico(true);
    const res = await fetch(
      `${BASE}/pagos/provincia-net/deuda?tipoTasa=URBANA&objetoClave=${PARTIDA}`
    );
    const body = await res.json();
    log(
      "http_deuda_urbana",
      res.status === 200 && body?.data?.objetoClave === PARTIDA,
      `status=${res.status} items=${body?.data?.items?.length}`
    );
  } catch (e) {
    log("http_deuda_urbana", false, e.message);
  } finally {
    await DeudaPagoService.actualizarPagoTasaUrbanaPublico(before);
  }

  // 6) Armar payments[] sin llamar a Provincia NET
  try {
    const built = await DeudaPagoService.construirPaymentsDesdeDeuda({
      tipoTasa: "URBANA",
      objetoClave: PARTIDA,
      itemIds: deuda?.items?.map((i) => i.id),
    });
    const payment = built.payments?.[0];
    log(
      "payments_desde_mongo",
      Boolean(payment?.barcode && payment?.amount && payment?.detail && payment?.service),
      `n=${built.payments?.length} amount=${payment?.amount} barcodeLen=${payment?.barcode?.length}`
    );
  } catch (e) {
    log("payments_desde_mongo", false, e.message);
  }

  // 7) Automotor solo lectura (si hay datos)
  try {
    const sample = await TasaBoleta.findOne({
      tipoTasa: "AUTOMOTORES",
      activa: true,
    })
      .select("objetoClave")
      .lean();
    if (!sample) {
      log("resolver_deuda_automotor", true, "skip (sin boletas activas)");
    } else {
      const auto = await DeudaPagoService.resolverDeuda({
        tipoTasa: "AUTOMOTORES",
        objetoClave: sample.objetoClave,
      });
      log(
        "resolver_deuda_automotor",
        auto?.items?.length >= 1,
        `dominio=${sample.objetoClave} items=${auto?.items?.length}`
      );
      const builtAuto = await DeudaPagoService.construirPaymentsDesdeDeuda({
        tipoTasa: "AUTOMOTORES",
        objetoClave: sample.objetoClave,
        itemIds: [auto.items[0].id],
      });
      log(
        "payments_automotor_readonly",
        builtAuto.payments?.length === 1,
        `amount=${builtAuto.payments[0].amount}`
      );
    }
  } catch (e) {
    log("resolver_deuda_automotor", false, e.message);
  }

  // 8) Garantía: no se invocó checkout PN
  log(
    "sin_llamada_checkout_pn",
    true,
    "este script no llama POST /preorder ni API Provincia NET"
  );

  // Cleanup smoke docs
  const cleaned = await TasaUrbanaDeuda.deleteMany({ partida: PARTIDA });
  log("cleanup_smoke_docs", true, `deleted=${cleaned.deletedCount || 0}`);

  await mongoose.disconnect();
  console.log(`\nResumen: ${passed} OK, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
