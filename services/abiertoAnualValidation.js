const PERIODS = [0, 1, 2];
const STATUS_REQUIERE_ARCHIVO = new Set(['Correcto', 'En revisión']);

function keyFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    const parts = String(url).split('.amazonaws.com/');
    return parts[1] ? decodeURIComponent(parts[1]) : null;
  }
}

function periodFromKey(key) {
  const m = String(key || '').match(/_(\d+)\.[^./]+$/);
  return m ? Number(m[1]) : null;
}

function parsePeriodo(periodo) {
  const n = Number(periodo);
  if (!Number.isInteger(n) || n < 0 || n > 2) return null;
  return n;
}

function isValidFacturaUrl(url, cuit, nroLegajo, periodo) {
  const key = keyFromUrl(url);
  if (!key) return false;
  if (periodFromKey(key) !== periodo) return false;
  const expected = `abierto-anual/${cuit}_${nroLegajo}_${periodo}.`;
  return key.startsWith(expected);
}

function statusRequiresFile(status) {
  return STATUS_REQUIERE_ARCHIVO.has(status);
}

function assertPeriodArrays(doc) {
  if (!Array.isArray(doc.facturas)) doc.facturas = [];
  if (!Array.isArray(doc.status)) doc.status = [];
  if (!Array.isArray(doc.fechasCarga)) doc.fechasCarga = [];
  while (doc.facturas.length < 3) doc.facturas.push(null);
  while (doc.status.length < 3) doc.status.push('Incompleto');
  while (doc.fechasCarga.length < 3) doc.fechasCarga.push(null);
}

module.exports = {
  PERIODS,
  keyFromUrl,
  periodFromKey,
  parsePeriodo,
  isValidFacturaUrl,
  statusRequiresFile,
  assertPeriodArrays,
};
