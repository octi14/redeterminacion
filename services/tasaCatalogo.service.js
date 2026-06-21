const Config = require("../models/configs.model");

const IMPORTACIONES_CONFIG_KEY = "boletaTasasImportaciones";
const COLORES_CONFIG_KEY = "boletaTasasColors";

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

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function temaDefault(tasa) {
  return { ...tasa.tema };
}

function normalizarColoresConfig(value = {}) {
  return TASAS.reduce((acc, tasa) => {
    const configTema = value && value[tasa.codigo] ? value[tasa.codigo] : {};
    const defaults = temaDefault(tasa);
    acc[tasa.codigo] = Object.keys(defaults).reduce((tema, key) => {
      tema[key] = isHexColor(configTema[key]) ? configTema[key] : defaults[key];
      return tema;
    }, {});
    return acc;
  }, {});
}

async function obtenerImportacionesConfig() {
  const config = await Config.findOne({ key: IMPORTACIONES_CONFIG_KEY }).lean();
  return normalizarImportacionesConfig(config ? config.value : {});
}

async function obtenerColoresConfig() {
  const config = await Config.findOne({ key: COLORES_CONFIG_KEY }).lean();
  return normalizarColoresConfig(config ? config.value : {});
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
  return TASAS.map((tasa) => ({ ...tasa, tema: temaDefault(tasa) }));
}

async function listarConConfig() {
  const [importacionesConfig, coloresConfig] = await Promise.all([
    obtenerImportacionesConfig(),
    obtenerColoresConfig(),
  ]);
  return TASAS.map((tasa) => ({
    ...tasa,
    tema: coloresConfig[tasa.codigo] || temaDefault(tasa),
    importacionHabilitada: importacionesConfig[tasa.codigo] !== false,
  }));
}

function obtener(codigo) {
  return TASAS.find((tasa) => tasa.codigo === String(codigo || "").toUpperCase()) || null;
}

async function obtenerConConfig(codigo) {
  const tasa = obtener(codigo);
  if (!tasa) return null;
  const coloresConfig = await obtenerColoresConfig();
  return {
    ...tasa,
    tema: coloresConfig[tasa.codigo] || temaDefault(tasa),
  };
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
  const tasa = await requerirConConfig(codigo);
  const config = await obtenerImportacionesConfig();
  if (config[tasa.codigo] === false) {
    throw Object.assign(new Error(`El modulo de ${tasa.nombre} esta deshabilitado desde configuraciones generales.`), { status: 409 });
  }
  return { ...tasa, importacionHabilitada: true };
}

async function requerirConConfig(codigo) {
  const tasa = await obtenerConConfig(codigo);
  if (!tasa) throw Object.assign(new Error("El tipo de tasa solicitado no existe."), { status: 400 });
  return tasa;
}

module.exports = {
  COLORES_CONFIG_KEY,
  IMPORTACIONES_CONFIG_KEY,
  actualizarImportacionesConfig,
  listar,
  listarConConfig,
  normalizarColoresConfig,
  normalizarImportacionesConfig,
  obtener,
  obtenerColoresConfig,
  obtenerConConfig,
  obtenerImportacionesConfig,
  requerir,
  requerirConConfig,
  requerirImportable,
};
