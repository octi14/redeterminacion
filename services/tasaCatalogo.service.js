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

function listar() {
  return TASAS.map((tasa) => ({ ...tasa }));
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

module.exports = { listar, obtener, requerir };
