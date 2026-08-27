const MENSAJE_BOLETA_DEFAULT =
  "Estimado vecino.|      Lo invitamos a recibir su Boleta de Pago por mail enviando la solicitud a   catastro@gesell.gob.ar   sin olvidar incorporar el nombre del Titular y el número de la Cuenta Municipal de 8 dígitos.  Además queremos comentarte que con tus impuestos al día, Villa Gesell crece, mejora y se pone cada vez más linda y que, sobre todo en estos momentos tan difíciles que nos toca vivir, valoramos mucho tu esfuerzo. |      Agradecemos más que nunca tu compromiso. Vos hacés que todo sea posible. |      Un cálido saludo.                Municipio de Villa Gesell.";

const MENSAJE_DEUDA_ANTERIOR = "Esta Partida Registra Deuda Anterior";

function texto(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}

function normalizarTexto(value) {
  return texto(value).replace(/\s+/g, " ").toLowerCase();
}

function esMensajeBoletaDefault(value) {
  const normalized = normalizarTexto(value);
  if (!normalized) return true;
  if (normalized.startsWith("estimado vecino")) return true;
  return normalized === normalizarTexto(MENSAJE_BOLETA_DEFAULT);
}

function detectarDeudaAnterior(row) {
  const deudaTexto = texto(row.DeudaTexto);
  if (deudaTexto) {
    if (deudaTexto.toUpperCase() === "S") return true;
    if (/deuda anterior/i.test(deudaTexto)) return true;
  }
  const texto2 = texto(row["TEXTO-2"] || row.TEXTO2);
  if (texto2 && !esMensajeBoletaDefault(texto2)) return true;
  return false;
}

function mensajeBoletaPersonalizadoDesdeFila(row) {
  const texto2 = texto(row["TEXTO-2"] || row.TEXTO2);
  if (!texto2 || esMensajeBoletaDefault(texto2)) return undefined;
  return texto2;
}

function resolverTextosBoleta({ deudaAnterior, mensajeBoletaPersonalizado } = {}) {
  return {
    mensajeDeuda: deudaAnterior ? MENSAJE_DEUDA_ANTERIOR : "",
    mensajeBoleta: mensajeBoletaPersonalizado || MENSAJE_BOLETA_DEFAULT,
  };
}

module.exports = {
  MENSAJE_BOLETA_DEFAULT,
  MENSAJE_DEUDA_ANTERIOR,
  esMensajeBoletaDefault,
  detectarDeudaAnterior,
  mensajeBoletaPersonalizadoDesdeFila,
  resolverTextosBoleta,
};
