const CONCEPTOS_URBANA = [
  "Tasa de Alumbrado", "Tasa de Limpieza", "Tasa CVP", "Tasa de Bomberos",
  "Tasa de Cementerio", "Tasa Turística", "Tasa de Seguridad", "Tasa de Salud",
  "Tasa de Residuos", "Tasa de Seguridad en Playas", "Tasa de Agua Corriente", "Retroactivo",
  "Obra de Gas", "Maq. vial", "Obras", "Obras Hospital", "Bonificación BC",
  "Bonificación 1° vencimiento", "Créditos",
];

function periodo(boleta) {
  return `${String(boleta.cuota).padStart(2, "0")}/${boleta.anio}`;
}

function expandir(boleta) {
  const raw = boleta.toObject ? boleta.toObject() : boleta;
  const objeto = raw.objetoId || {};
  const mensaje = objeto.mensajeBoletaId || {};
  return {
    ...raw,
    periodo: periodo(raw),
    contribuyente: objeto.contribuyente || {},
    objeto: objeto.objeto || {},
    mensajeDeuda: objeto.mensajeDeuda || "",
    mensajeBoleta: mensaje.texto || "",
    codigosPago: objeto.codigosPago || {},
    conceptos: (raw.conceptosCompactos || []).map(([codigo, importeCentavos]) => ({
      codigo,
      nombre: CONCEPTOS_URBANA[codigo] || `Concepto ${codigo}`,
      importeCentavos,
    })),
  };
}

module.exports = { CONCEPTOS_URBANA, expandir, periodo };
