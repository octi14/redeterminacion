const crypto = require("crypto");
const TasaUrbanaCuenta = require("../models/tasaUrbanaCuenta.model");
const TasaUrbanaMensajePlantilla = require("../models/tasaUrbanaMensajePlantilla.model");

/**
 * Formato compacto de tasaurbanadeudas:
 * - cuentaId: contribuyente, objeto y codigosPago en tasaurbanacuentas (compartidos entre períodos y tiradas).
 * - cc: conceptosCompactos como "indice:importe,indice:importe".
 * - vt: vencimientos como "importe:codigoBarra;importe:codigoBarra" (orden 1, 2, ...).
 *   Sin importeCentavos: es el importe del primer vencimiento.
 * - mp + mv: mensaje personalizado como plantilla (dígitos reemplazados por MARCA) + dígitos separados por "|".
 * - recibo ausente: es `${anio}-${cuota con dos dígitos}`; recibo null: no tenía recibo.
 */

const MARCA = "\u0001";
const DIGITOS = /\d+/g;
const CAMPOS_VISTA = [
  "partida",
  "contribuyente",
  "objeto",
  "anio",
  "cuota",
  "recibo",
  "debito",
  "deudaAnterior",
  "mensajeBoletaPersonalizado",
  "conceptosCompactos",
  "importeCentavos",
  "vencimientos",
  "codigosPago",
];

function canonico(value) {
  if (Array.isArray(value)) return value.map(canonico);
  if (value && typeof value === "object" && !(value instanceof Date) && value._bsontype === undefined) {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonico(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha1").update(JSON.stringify(canonico(value))).digest("hex");
}

function reciboDerivado(anio, cuota) {
  return `${anio}-${String(cuota).padStart(2, "0")}`;
}

function rellenarPlantilla(plantilla, valores) {
  const partes = plantilla.split(MARCA);
  const lista = valores ? valores.split("|") : [];
  if (lista.length !== partes.length - 1) return null;
  return partes.reduce((acc, parte, index) => acc + parte + (index < lista.length ? lista[index] : ""), "");
}

function codificarConceptos(conceptos) {
  if (!Array.isArray(conceptos)) return null;
  const valido = conceptos.every(
    (item) => Array.isArray(item) && item.length === 2 && item.every((n) => Number.isInteger(n))
  );
  return valido ? conceptos.map(([indice, importe]) => `${indice}:${importe}`).join(",") : null;
}

function decodificarConceptos(cc) {
  return cc ? cc.split(",").map((par) => par.split(":").map(Number)) : [];
}

function codificarVencimientos(vencimientos) {
  if (!Array.isArray(vencimientos)) return null;
  const valido = vencimientos.every((item, index) => {
    if (!item || typeof item !== "object") return false;
    const claves = Object.keys(item).filter((key) => item[key] !== undefined);
    return (
      claves.length === 3 &&
      item.orden === index + 1 &&
      Number.isInteger(item.importeCentavos) &&
      typeof item.codigoBarra === "string" &&
      !/[:;]/.test(item.codigoBarra)
    );
  });
  return valido ? vencimientos.map((item) => `${item.importeCentavos}:${item.codigoBarra}`).join(";") : null;
}

function decodificarVencimientos(vt) {
  if (!vt) return [];
  return vt.split(";").map((item, index) => {
    const separador = item.indexOf(":");
    return {
      orden: index + 1,
      importeCentavos: Number(item.slice(0, separador)),
      codigoBarra: item.slice(separador + 1),
    };
  });
}

/** Devuelve la boleta con la forma legacy que esperan los lectores. Las legacy pasan sin cambios. */
function expandirDoc(doc, cuenta, plantilla) {
  if (!doc || !doc.cuentaId) return doc;
  const { cuentaId, cc, vt, mp, mv, ...out } = doc;
  if (out.contribuyente === undefined && cuenta?.contribuyente !== undefined) out.contribuyente = cuenta.contribuyente;
  if (out.objeto === undefined && cuenta?.objeto !== undefined) out.objeto = cuenta.objeto;
  if (out.codigosPago === undefined && cuenta?.codigosPago !== undefined) out.codigosPago = cuenta.codigosPago;
  if (out.conceptosCompactos === undefined && typeof cc === "string") out.conceptosCompactos = decodificarConceptos(cc);
  if (out.vencimientos === undefined && typeof vt === "string") {
    out.vencimientos = decodificarVencimientos(vt);
    if (out.importeCentavos === undefined && out.vencimientos.length) {
      out.importeCentavos = out.vencimientos[0].importeCentavos;
    }
  }
  if (out.mensajeBoletaPersonalizado === undefined && mp && typeof plantilla === "string") {
    const mensaje = rellenarPlantilla(plantilla, mv);
    if (mensaje != null) out.mensajeBoletaPersonalizado = mensaje;
  }
  if (!Object.prototype.hasOwnProperty.call(out, "recibo")) out.recibo = reciboDerivado(out.anio, out.cuota);
  else if (out.recibo === null) delete out.recibo;
  return out;
}

/** Expande un lote de boletas leídas con .lean(), cargando cuentas y plantillas en dos consultas. */
async function expandirDeudas(docs = []) {
  const compactos = docs.filter((doc) => doc?.cuentaId);
  if (!compactos.length) return docs;
  const cuentaIds = [...new Set(compactos.map((doc) => String(doc.cuentaId)))];
  const plantillaIds = [...new Set(compactos.filter((doc) => doc.mp).map((doc) => String(doc.mp)))];
  const [cuentas, plantillas] = await Promise.all([
    TasaUrbanaCuenta.find({ _id: { $in: cuentaIds } }).lean(),
    plantillaIds.length
      ? TasaUrbanaMensajePlantilla.find({ _id: { $in: plantillaIds } }).lean()
      : [],
  ]);
  const cuentasPorId = new Map(cuentas.map((item) => [String(item._id), item]));
  const plantillasPorId = new Map(plantillas.map((item) => [String(item._id), item.texto]));
  return docs.map((doc) =>
    doc?.cuentaId
      ? expandirDoc(doc, cuentasPorId.get(String(doc.cuentaId)), doc.mp ? plantillasPorId.get(String(doc.mp)) : undefined)
      : doc
  );
}

/**
 * Calcula la versión compacta de una boleta legacy.
 * Devuelve { set, unset, cuenta, plantilla } o null si ya es compacta.
 * cuenta: { partida, hash, contribuyente, objeto, codigosPago }; plantilla: { hash, texto } | null.
 */
function compactarDoc(doc, codigosPago) {
  if (!doc || doc.cuentaId) return null;
  const set = {};
  const unset = {};

  const cuenta = {
    partida: doc.partida,
    contribuyente: doc.contribuyente,
    objeto: doc.objeto,
    codigosPago: codigosPago || undefined,
  };
  cuenta.hash = hash({ contribuyente: cuenta.contribuyente, objeto: cuenta.objeto, codigosPago: cuenta.codigosPago });
  if (doc.contribuyente !== undefined) unset.contribuyente = "";
  if (doc.objeto !== undefined) unset.objeto = "";

  const cc = codificarConceptos(doc.conceptosCompactos);
  if (cc != null) {
    set.cc = cc;
    unset.conceptosCompactos = "";
  }

  const vt = codificarVencimientos(doc.vencimientos);
  if (vt != null) {
    set.vt = vt;
    unset.vencimientos = "";
    const primero = doc.vencimientos[0];
    if (primero && doc.importeCentavos === primero.importeCentavos) unset.importeCentavos = "";
  }

  let plantilla = null;
  const mensaje = doc.mensajeBoletaPersonalizado;
  if (typeof mensaje === "string" && mensaje && !mensaje.includes(MARCA)) {
    const texto = mensaje.replace(DIGITOS, MARCA);
    const valores = (mensaje.match(DIGITOS) || []).join("|");
    if (rellenarPlantilla(texto, valores) === mensaje) {
      plantilla = { hash: hash(texto), texto };
      set.mv = valores;
      unset.mensajeBoletaPersonalizado = "";
    }
  }

  if (doc.recibo === undefined) set.recibo = null;
  else if (doc.recibo === reciboDerivado(doc.anio, doc.cuota)) unset.recibo = "";

  return { set, unset, cuenta, plantilla };
}

/** Aplica set/unset en memoria (para verificar antes de escribir). */
function aplicarEnMemoria(doc, { set, unset }, cuentaId, plantillaId) {
  const copia = { ...doc };
  for (const key of Object.keys(unset)) delete copia[key];
  Object.assign(copia, set, { cuentaId });
  if (plantillaId) copia.mp = plantillaId;
  return copia;
}

/** Campos que consumen los lectores, en forma comparable. */
function vista(doc, codigosPago) {
  const out = {};
  for (const campo of CAMPOS_VISTA) {
    const value = campo === "codigosPago" ? (doc.codigosPago ?? codigosPago) : doc[campo];
    if (value !== undefined) out[campo] = value;
  }
  return JSON.stringify(canonico(out));
}

module.exports = {
  expandirDoc,
  expandirDeudas,
  compactarDoc,
  aplicarEnMemoria,
  vista,
};
