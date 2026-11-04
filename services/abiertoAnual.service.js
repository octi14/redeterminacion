let AbiertoAnual = require("../models/abiertoAnual.model");
const {
  isValidFacturaUrl,
  statusRequiresFile,
  parsePeriodo,
} = require("./abiertoAnualValidation");

exports.findAll = async function () {
  try {
    return await AbiertoAnual.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (formData) {
  try {
    const nuevoAbiertoAnual = new AbiertoAnual({
      cuit: formData.cuit,
      nroLegajo: formData.nroLegajo,
      facturas: [null, null, null],
      status: ["Incompleto", "Incompleto", "Incompleto"],
      fechasCarga: [null, null, null],
      observaciones: "",
    });

    const createdAbiertoAnual = await nuevoAbiertoAnual.save();
    return createdAbiertoAnual;
  } catch (e) {
    throw new Error(
      "No se pudo crear el elemento. Detalles del error: " + e.message
    );
  }
};

function slotMeta(factura) {
  if (!factura || typeof factura !== "object") {
    return { observaciones: "", rectificando: false };
  }
  return {
    observaciones: factura.observaciones ?? "",
    rectificando: !!factura.rectificando,
  };
}

function resolveUrlForPeriod(existingUrl, incomingUrl, cuit, nroLegajo, index) {
  // El cliente NUNCA puede imponer una URL: solo se conservan URLs ya válidas en DB.
  // Si la existente es inválida/cruzada, se descarta.
  if (existingUrl && isValidFacturaUrl(existingUrl, cuit, nroLegajo, index)) {
    return existingUrl;
  }
  // Ignorar incomingUrl del cliente (posible data mala del front).
  void incomingUrl;
  return undefined;
}

exports.update = async function (id, update) {
  if (!update || typeof update !== "object") {
    throw new Error("Payload de actualización inválido.");
  }

  const existing = await AbiertoAnual.findById(id);
  if (!existing) return null;

  const cuit = existing.cuit;
  const nroLegajo = existing.nroLegajo;

  // Sin facturas en el payload: update parcial, igual validar status si viene.
  if (!update.facturas || !Array.isArray(update.facturas)) {
    if (Array.isArray(update.status)) {
      for (let i = 0; i < Math.min(3, update.status.length); i++) {
        const st = update.status[i];
        const prevSt = existing.status?.[i] || "Incompleto";
        if (st === prevSt) continue;
        const url = existing.facturas?.[i]?.url;
        if (
          statusRequiresFile(st) &&
          !isValidFacturaUrl(url, cuit, nroLegajo, i)
        ) {
          throw new Error(
            `No se puede poner el período ${i + 1} en "${st}" sin un archivo válido de ese período.`
          );
        }
      }
    }
    return AbiertoAnual.findOneAndUpdate({ _id: id }, update, { new: true });
  }

  const incomingStatus = Array.isArray(update.status) ? update.status : null;
  const mergedStatus = [0, 1, 2].map((i) => {
    if (incomingStatus && incomingStatus[i] != null && incomingStatus[i] !== "") {
      return String(incomingStatus[i]);
    }
    return existing.status?.[i] || "Incompleto";
  });

  const mergedFacturas = [0, 1, 2].map((index) => {
    const prev = existing.facturas?.[index] ?? null;
    const factura =
      update.facturas.length > index ? update.facturas[index] : null;

    if (factura == null) {
      const url = resolveUrlForPeriod(prev?.url, null, cuit, nroLegajo, index);
      if (!prev && !url) return null;
      return {
        observaciones: prev?.observaciones ?? "",
        rectificando: !!prev?.rectificando,
        ...(url ? { url } : {}),
      };
    }

    const meta = slotMeta(factura);
    const prevMeta = slotMeta(prev);
    const url = resolveUrlForPeriod(
      prev?.url,
      factura.url,
      cuit,
      nroLegajo,
      index
    );

    return {
      observaciones:
        factura.observaciones !== undefined
          ? meta.observaciones
          : prevMeta.observaciones,
      rectificando:
        factura.rectificando !== undefined
          ? meta.rectificando
          : prevMeta.rectificando,
      ...(url ? { url } : {}),
    };
  });

  for (let i = 0; i < 3; i++) {
    const st = mergedStatus[i];
    const prevSt = existing.status?.[i] || "Incompleto";
    // Solo validar transiciones nuevas; no bloquear ediciones por status históricos inconsistentes.
    if (st === prevSt) continue;
    const url = mergedFacturas[i]?.url;
    if (statusRequiresFile(st) && !isValidFacturaUrl(url, cuit, nroLegajo, i)) {
      throw new Error(
        `No se puede poner el período ${i + 1} en "${st}" sin un archivo válido de ese período.`
      );
    }
  }

  // No aceptar fechasCarga ni urls inventadas desde el cliente.
  const { fechasCarga, ...rest } = update;

  return AbiertoAnual.findOneAndUpdate(
    { _id: id },
    {
      ...rest,
      facturas: mergedFacturas,
      status: mergedStatus,
    },
    { new: true }
  );
};

exports.updateLazy = async function (id, update) {
  return AbiertoAnual.findOneAndUpdate({ _id: id }, update, {
    new: true,
  }).select("-facturas");
};

exports.delete = async function (id) {
  return AbiertoAnual.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return AbiertoAnual.findById(id);
};

exports.parsePeriodo = parsePeriodo;
