const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'application/octet-stream',
]);

function normalizeContentType(raw) {
  const base = String(raw || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  if (base === 'application/x-pdf') return 'application/pdf';
  if (ALLOWED_CONTENT_TYPES.has(base)) return base;
  return 'application/octet-stream';
}

function extensionFromContentType(contentType) {
  const normalized = normalizeContentType(contentType);
  const subtype = normalized.split('/')[1] || 'bin';
  if (subtype === 'jpeg') return 'jpg';
  if (subtype === 'heif') return 'heic';
  return subtype.split('+')[0] || 'bin';
}

function slugifyDocumentoNombre(nombre) {
  const slug = String(nombre || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return slug || 'documento';
}

function buildDocumentoKey(nombreDocumento, nroTramite, contentType) {
  const ext = extensionFromContentType(contentType);
  return `mongo-backup/${slugifyDocumentoNombre(nombreDocumento)}_${nroTramite}.${ext}`;
}

function isSafeMongoBackupKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (!key.startsWith('mongo-backup/')) return false;
  if (key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  return true;
}

function toNumberOrUndefined(value) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

module.exports = {
  normalizeContentType,
  extensionFromContentType,
  slugifyDocumentoNombre,
  buildDocumentoKey,
  isSafeMongoBackupKey,
  toNumberOrUndefined,
};
