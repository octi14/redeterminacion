let Turno = require("../models/turno.model");
const Habilitacion = require("../models/habilitacion.model");

const SOLICITUD_PROJECTION =
  "nroSolicitud nroLegajo solicitante.nombre solicitante.apellido solicitante.tipoSolicitud";

function buildNombreSolicitante(solicitante) {
  if (!solicitante) return null;
  const nombre = [solicitante.nombre, solicitante.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombre || null;
}

function solicitudFieldsFromHabilitacion(habilitacion) {
  if (!habilitacion) {
    return { nombreSolicitante: null, nroLegajoComercial: null };
  }
  const tipoSolicitud = habilitacion.solicitante?.tipoSolicitud;
  const nombreSolicitante = buildNombreSolicitante(habilitacion.solicitante);
  const nroLegajoComercial =
    tipoSolicitud && tipoSolicitud !== "Habilitación"
      ? habilitacion.nroLegajo ?? null
      : null;
  return { nombreSolicitante, nroLegajoComercial };
}

function tramiteKey(nro) {
  if (nro == null || nro === "") return null;
  const asNumber = Number(nro);
  return Number.isNaN(asNumber) ? nro : asNumber;
}

async function loadSolicitudMap(nroTramites) {
  const numeros = [
    ...new Set(nroTramites.map(tramiteKey).filter((n) => n != null)),
  ];
  if (!numeros.length) return new Map();

  const habilitaciones = await Habilitacion.find({
    nroSolicitud: { $in: numeros },
  })
    .select(SOLICITUD_PROJECTION)
    .lean();

  const map = new Map();
  for (const habilitacion of habilitaciones) {
    map.set(tramiteKey(habilitacion.nroSolicitud), habilitacion);
  }
  return map;
}

function toPlainTurno(turno) {
  return turno?.toObject ? turno.toObject() : { ...turno };
}

function attachSolicitudDatos(turno, solicitudMap) {
  const plain = toPlainTurno(turno);
  const habilitacion = solicitudMap.get(tramiteKey(plain.nroTramite));
  return {
    ...plain,
    ...solicitudFieldsFromHabilitacion(habilitacion),
    nombreTurno: plain.nombre ?? null,
  };
}

async function enrichTurnos(turnos) {
  const list = Array.isArray(turnos) ? turnos : [turnos];
  const solicitudMap = await loadSolicitudMap(list.map((t) => t?.nroTramite));
  const enriched = list.map((turno) =>
    turno ? attachSolicitudDatos(turno, solicitudMap) : turno
  );
  return Array.isArray(turnos) ? enriched : enriched[0];
}

exports.findAll = async function () {
  try {
    const turnos = await Turno.find();
    return enrichTurnos(turnos);
  } catch (e) {
    console.error(e);
    throw Error("Error getting turnos.");
  }
};

exports.create = async function (turnoData) {
  const file = new Turno(turnoData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Turno.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.getById = async function (id) {
  const turno = await Turno.findById(id);
  if (!turno) return null;
  return enrichTurnos(turno);
};

exports.getByNroTramite = async function (nroTramite) {
  const turnos = await Turno.find({
    nroTramite: nroTramite,
  });
  return enrichTurnos(turnos);
};

exports.delete = async function (id) {
  return Turno.deleteOne({ _id: id });
};

exports.getOrCreate = async function (name) {
  const found = await Turno.findOne({
    name,
  });
  return (
    found ||
    Turno.create({
      name,
    })
  );
};
