const Config = require("../models/configs.model");

const IMPORTACIONES_CONFIG_KEY = "boletaTasasImportaciones";

const TASAS = [
  {
    codigo: "AUTOMOTORES",
    nombre: "Automotores",
    descripcion: "Boletas asociadas al dominio de un vehículo.",
    identificador: "dominio",
    icono: "car-front-fill",
    formatos: ["completo", "simplificado"],
    importacionHabilitada: true,
    tema: {
      principal: "#bd3041",
      oscuro: "#771a28",
      suave: "#fbdde1",
    },
  },
  {
    codigo: "URBANA",
    nombre: "Tasa Urbana",
    descripcion: "Boletas asociadas a partidas inmobiliarias.",
    identificador: "partida",
    icono: "building",
    formatos: ["urbana"],
    importacionHabilitada: true,
    tema: {
      principal: "#13875e",
      oscuro: "#075e4a",
      suave: "#e3f5ed",
    },
  },
];

function normalizarImportacionesConfig(value = {}) {
  return TASAS.reduce((acc, tasa) => {
    acc[tasa.codigo] = typeof value[tasa.codigo] === "boolean"
      ? value[tasa.codigo]
      : Boolean(tasa.importacionHabilitada);
    return acc;
  }, {});
}

async function obtenerImportacionesConfig() {
  const config = await Config.findOne({ key: IMPORTACIONES_CONFIG_KEY }).lean();
  return normalizarImportacionesConfig(config ? config.value : {});
}

async function actualizarImportacionesConfig(value = {}) {
  return Config.findOneAndUpdate(
    { key: IMPORTACIONES_CONFIG_KEY },
    {
      key: IMPORTACIONES_CONFIG_KEY,
      value: normalizarImportacionesConfig(value),
      description: "Habilita o deshabilita los modulos de importacion de boletas por tipo de tasa.",
    },
    { new: true, upsert: true, runValidators: true }
  );
}

function listar() {
  return TASAS.map((tasa) => ({ ...tasa }));
}

async function listarConConfig() {
  const config = await obtenerImportacionesConfig();
  return TASAS.map((tasa) => ({
    ...tasa,
    importacionHabilitada: config[tasa.codigo] !== false,
  }));
}

function obtener(codigo) {
  return TASAS.find((tasa) => tasa.codigo === String(codigo || "").toUpperCase()) || null;
}

function requerir(codigo, { importable = false } = {}) {
  const tasa = obtener(codigo);
  if (!tasa) throw Object.assign(new Error("El tipo de tasa solicitado no existe."), { status: 400 });
  if (importable && !tasa.importacionHabilitada) {
    throw Object.assign(new Error(`La importación de ${tasa.nombre} todavía no está habilitada.`), { status: 409 });
  }
  return tasa;
}

async function requerirImportable(codigo) {
  const tasa = requerir(codigo);
  const config = await obtenerImportacionesConfig();
  if (config[tasa.codigo] === false) {
    throw Object.assign(new Error(`El modulo de ${tasa.nombre} esta deshabilitado desde configuraciones generales.`), { status: 409 });
  }
  return { ...tasa, importacionHabilitada: true };
}

module.exports = {
  IMPORTACIONES_CONFIG_KEY,
  actualizarImportacionesConfig,
  listar,
  listarConConfig,
  normalizarImportacionesConfig,
  obtener,
  obtenerImportacionesConfig,
  requerir,
  requerirImportable,
};
