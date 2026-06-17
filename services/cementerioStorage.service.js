const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

function isAllowedDocument({ nombre, contentType }) {
  const type = String(contentType || '').toLowerCase();
  const name = String(nombre || '').toLowerCase();
  return allowedMimeTypes.has(type)
    || type.startsWith('image/')
    || /\.(pdf|jpe?g|png|gif|webp|bmp)$/.test(name);
}

exports.uploadBase64 = async function ({ folder = 'cementerio', nombre, contentType, data }) {
  if (!data) throw new Error('El archivo no contiene datos.');
  if (!isAllowedDocument({ nombre, contentType })) {
    throw new Error('Solo se permiten archivos PDF o imagen.');
  }
  const safeName = String(nombre || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await s3.upload({
    Bucket: process.env.AWS_BUCKET || 'haciendagesell',
    Key: `${folder}/${Date.now()}_${safeName}`,
    Body: Buffer.from(data, 'base64'),
    ContentType: contentType || 'application/octet-stream',
  }).promise();
  return result.Location;
};

exports.keyFromUrl = function (url) {
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  } catch (error) {
    return null;
  }
};

exports.getSignedUrl = function (url, expires = 60 * 10) {
  const key = exports.keyFromUrl(url);
  if (!key) return url;
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_BUCKET || 'haciendagesell',
    Key: key,
    Expires: expires,
  });
};
