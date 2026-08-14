const config = require("../config.js");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");
const TasaBoleta = require("../models/tasaBoleta.model");
require("../models/tasaObjeto.model");
const Config = require("../models/configs.model");

const TIPOS = {
  URBANA: "URBANA",
  AUTOMOTORES: "AUTOMOTORES",
};

const CONFIG_PAGO_URBANA_PUBLICO = "pagoTasaUrbanaPublico";

function amountFromCentavos(centavos) {
  return (Number(centavos) / 100).toFixed(2);
}

function periodoLabel(cuota, anio) {
  return `${String(cuota).padStart(2, "0")}/${anio}`;
}

function normalizarPartida(value) {
  return String(value || "").replace(/\s/g, "").toUpperCase();
}

function normalizarDominio(value) {
  return String(value || "").replace(/[\s-]/g, "").toUpperCase();
}

function normalizarTipoTasa(value) {
  const tipo = String(value || TIPOS.URBANA).trim().toUpperCase();
  if (!Object.values(TIPOS).includes(tipo)) {
    const err = new Error("Tipo de tasa no soportado.");
    err.status = 400;
    throw err;
  }
  return tipo;
}

/** El día del vencimiento sigue vigente hasta las 23:59:59 local. */
function finDelDia(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return NaN;
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function elegirVencimiento(vencimientos = [], now = Date.now()) {
  if (!Array.isArray(vencimientos) || !vencimientos.length) return null;
  const sorted = [...vencimientos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return (
    sorted.find((item) => {
      const fin = finDelDia(item.fecha);
      return !Number.isNaN(fin) && fin >= now;
    }) || null
  );
}

function mapVencimientosPublicos(vencimientos = [], now = Date.now()) {
  return [...(vencimientos || [])]
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map((item) => {
      const fin = finDelDia(item.fecha);
      const vigente = !Number.isNaN(fin) && fin >= now;
      return {
        orden: item.orden,
        fecha: item.fecha,
        importeCentavos: item.importeCentavos,
        importe: amountFromCentavos(item.importeCentavos),
        vigente,
        vencido: !vigente,
      };
    });
}

function mapItem({ id, tipoTasa, objetoClave, anio, cuota, importeCentavos, vencimientos }) {
  const periodo = periodoLabel(cuota, anio);
  const vtos = mapVencimientosPublicos(vencimientos);
  const vto = elegirVencimiento(vencimientos);
  const vencido = !vto;
  const importePagoCentavos = vto ? vto.importeCentavos : importeCentavos;
  const detalleBase =
    tipoTasa === TIPOS.AUTOMOTORES
      ? `Municipalidad de Villa Gesell. Tasa Automotor ${objetoClave} ${periodo}`
      : `Municipalidad de Villa Gesell. Tasa Urbana ${objetoClave} ${periodo}`;

  return {
    id: String(id),
    periodo,
    anio,
    cuota,
    importeCentavos: importePagoCentavos,
    importe: amountFromCentavos(importePagoCentavos),
    vencido,
    pagable: !vencido,
    vencimientoActivo: vto
      ? {
          orden: vto.orden,
          fecha: vto.fecha,
          importeCentavos: vto.importeCentavos,
          importe: amountFromCentavos(vto.importeCentavos),
        }
      : null,
    vencimientos: vtos,
    detail: detalleBase,
    _payment:
      !vencido && vto
        ? {
            amount: amountFromCentavos(vto.importeCentavos),
            detail: detalleBase,
            barcode: String(vto.codigoBarra || ""),
            service: config.PROVINCIA_NET_SERVICE_CODE,
          }
        : null,
  };
}

async function resolverUrbana(partida) {
  const clave = normalizarPartida(partida);
  if (!/^[A-Z0-9]{1,16}$/.test(clave)) {
    const err = new Error("Ingresá una partida válida.");
    err.status = 400;
    throw err;
  }

  const docs = await TasaUrbanaDeuda.find({ partida: clave, activa: true })
    .sort({ anio: -1, cuota: -1 })
    .lean();

  if (!docs.length) {
    const err = new Error("No encontramos deuda activa para esa partida.");
    err.status = 404;
    throw err;
  }

  const first = docs[0];
  const items = docs.map((doc) =>
    mapItem({
      id: doc._id,
      tipoTasa: TIPOS.URBANA,
      objetoClave: clave,
      anio: doc.anio,
      cuota: doc.cuota,
      importeCentavos: doc.importeCentavos,
      vencimientos: doc.vencimientos,
    })
  );

  const saldoCentavos = items.reduce((acc, item) => acc + Number(item.importeCentavos || 0), 0);

  return {
    tipoTasa: TIPOS.URBANA,
    objetoClave: clave,
    identificadorLabel: "partida",
    contribuyente: first.contribuyente || {},
    objeto: first.objeto || { partida: clave },
    items: items.map(({ _payment, ...rest }) => rest),
    saldoCentavos,
    saldo: amountFromCentavos(saldoCentavos),
    _paymentItems: items,
  };
}

async function resolverAutomotor(dominio) {
  const clave = normalizarDominio(dominio);
  if (!/^[A-Z0-9]{5,9}$/.test(clave)) {
    const err = new Error("Ingresá un dominio válido.");
    err.status = 400;
    throw err;
  }

  const boletas = await TasaBoleta.find({
    tipoTasa: TIPOS.AUTOMOTORES,
    objetoClave: clave,
    activa: true,
  })
    .sort({ anio: -1, cuota: -1 })
    .populate("objetoId")
    .lean();

  if (!boletas.length) {
    const err = new Error("No encontramos boletas activas para ese dominio.");
    err.status = 404;
    throw err;
  }

  const objetoDoc = boletas[0].objetoId || {};
  const items = boletas.map((boleta) =>
    mapItem({
      id: boleta._id,
      tipoTasa: TIPOS.AUTOMOTORES,
      objetoClave: clave,
      anio: boleta.anio,
      cuota: boleta.cuota,
      importeCentavos: boleta.importeCentavos,
      vencimientos: boleta.vencimientos,
    })
  );

  const saldoCentavos = items.reduce((acc, item) => acc + Number(item.importeCentavos || 0), 0);

  return {
    tipoTasa: TIPOS.AUTOMOTORES,
    objetoClave: clave,
    identificadorLabel: "dominio",
    contribuyente: objetoDoc.contribuyente || {},
    objeto: objetoDoc.objeto || { dominio: clave },
    items: items.map(({ _payment, ...rest }) => rest),
    saldoCentavos,
    saldo: amountFromCentavos(saldoCentavos),
    _paymentItems: items,
  };
}

exports.resolverDeuda = async function resolverDeuda({ tipoTasa, objetoClave } = {}) {
  const tipo = normalizarTipoTasa(tipoTasa);
  if (tipo === TIPOS.URBANA) return resolverUrbana(objetoClave);
  return resolverAutomotor(objetoClave);
};

exports.construirPaymentsDesdeDeuda = async function construirPaymentsDesdeDeuda({
  tipoTasa,
  objetoClave,
  itemIds,
  periodos,
} = {}) {
  const deuda = await exports.resolverDeuda({ tipoTasa, objetoClave });
  let selected = deuda._paymentItems;

  if (Array.isArray(itemIds) && itemIds.length) {
    const set = new Set(itemIds.map(String));
    selected = selected.filter((item) => set.has(String(item.id)));
  } else if (Array.isArray(periodos) && periodos.length) {
    const set = new Set(periodos.map(String));
    selected = selected.filter((item) => set.has(item.periodo));
  }

  if (!selected.length) {
    const err = new Error("No hay ítems seleccionados para pagar.");
    err.status = 400;
    throw err;
  }
  if (selected.length > 10) {
    const err = new Error("Máximo 10 ítems por intención de pago.");
    err.status = 400;
    throw err;
  }

  const vencidos = selected.filter((item) => item.vencido || !item._payment);
  if (vencidos.length) {
    const periodos = vencidos.map((item) => item.periodo).join(", ");
    const err = new Error(
      vencidos.length === 1
        ? `El período ${periodos} está vencido y no se puede abonar online. Para regularizarlo, acercate a Recaudaciones.`
        : `Los períodos ${periodos} están vencidos y no se pueden abonar online. Para regularizarlos, acercate a Recaudaciones.`
    );
    err.status = 400;
    throw err;
  }

  const payments = selected.map((item) => {
    if (!item._payment?.barcode || /^0+$/.test(item._payment.barcode)) {
      const err = new Error(`El período ${item.periodo} no tiene un código de barras válido.`);
      err.status = 400;
      throw err;
    }
    return item._payment;
  });

  return {
    tipoTasa: deuda.tipoTasa,
    objetoClave: deuda.objetoClave,
    payments,
    deudaPublica: {
      tipoTasa: deuda.tipoTasa,
      objetoClave: deuda.objetoClave,
      identificadorLabel: deuda.identificadorLabel,
      contribuyente: deuda.contribuyente,
      objeto: deuda.objeto,
      items: deuda.items,
      saldoCentavos: deuda.saldoCentavos,
      saldo: deuda.saldo,
    },
  };
};

exports.pagoTasaUrbanaPublicoHabilitado = async function pagoTasaUrbanaPublicoHabilitado() {
  const cfg = await Config.findOne({ key: CONFIG_PAGO_URBANA_PUBLICO }).lean();
  return Boolean(cfg && cfg.value === true);
};

exports.actualizarPagoTasaUrbanaPublico = async function actualizarPagoTasaUrbanaPublico(value) {
  return Config.findOneAndUpdate(
    { key: CONFIG_PAGO_URBANA_PUBLICO },
    {
      value: value === true,
      description: "Habilita la visibilidad pública del pago de tasa urbana en /pagos.",
    },
    { new: true, upsert: true }
  );
};

exports.TIPOS = TIPOS;
exports.CONFIG_PAGO_URBANA_PUBLICO = CONFIG_PAGO_URBANA_PUBLICO;
exports.normalizarTipoTasa = normalizarTipoTasa;
exports.normalizarPartida = normalizarPartida;
exports.normalizarDominio = normalizarDominio;
