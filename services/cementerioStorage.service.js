const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

exports.uploadBase64 = async function ({ folder = 'cementerio', nombre, contentType, data }) {
  if (!data) throw new Error('El archivo no contiene datos.');
  const safeName = String(nombre || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await s3.upload({
    Bucket: process.env.AWS_BUCKET || 'haciendagesell',
    Key: `${folder}/${Date.now()}_${safeName}`,
    Body: Buffer.from(data, 'base64'),
    ContentType: contentType || 'application/octet-stream',
  }).promise();
  return result.Location;
};
