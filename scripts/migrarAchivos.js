/*const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const AWS = require('aws-sdk');
const Habilitacion = require('../models/habilitacion.model'); // Ajusta la ruta según tu estructura
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, MONGO_URL } = require('../config');

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const S3_BUCKET_NAME = 'haciendagesell';
const GRIDFS_BUCKET_NAME = 'documentos';

// Conexión a MongoDB
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.once('open', async () => {
  console.log('Conectado a MongoDB');
  const bucket = new GridFSBucket(db.db, { bucketName: GRIDFS_BUCKET_NAME });

  try {
    const habilitaciones = await Habilitacion.find({ 'documentos.documentos.contenido': { $exists: true } });

    if (!habilitaciones.length) {
      console.log('No hay documentos con contenido en GridFS para migrar.');
      return;
    }

    for (const habilitacion of habilitaciones) {
      for (const documento of habilitacion.documentos.documentos) {
        // Verificar si el documento ya tiene una URL
        if (documento.url === undefined) {
          documento.url = null; // Inicializamos el campo `url` como null si no existe
        }

        // Si el documento tiene contenido y la URL está vacía, se procesa
        if (documento.contenido) {
          try {
            const fileId = documento.contenido;

            // Obtener el archivo desde GridFS
            const file = await bucket.find({ _id: fileId }).toArray();
            if (file.length === 0) {
              console.log(`No se encontró archivo con ID: ${fileId}`);
              continue;
            }

            // Obtener el nombre del archivo y la extensión desde el archivo de GridFS
            const filename = file[0].filename || 'archivo_sin_nombre'; // Usar el filename si existe
            const contentType = file[0].contentType || 'application/octet-stream'; // Usar el contentType si existe
            const fileExtension = mimeExtension(contentType); // Obtener la extensión según el contentType

            // Reemplazar las barras (/) por guiones bajos (_) para evitar la creación de carpetas
            const sanitizedFilename = filename.replace(/\//g, '_');

            // Descargar el archivo desde GridFS
            const chunks = [];
            const downloadStream = bucket.openDownloadStream(fileId);
            await new Promise((resolve, reject) => {
              downloadStream.on('data', (chunk) => chunks.push(chunk));
              downloadStream.on('end', resolve);
              downloadStream.on('error', reject);
            });

            const fileBuffer = Buffer.concat(chunks);

            // Subir el archivo a S3 con el nombre sanitizado
            const params = {
              Bucket: S3_BUCKET_NAME,
              Key: `mongo-backup/${sanitizedFilename}${fileExtension}`, // Usar el nombre sanitizado
              Body: fileBuffer,
              ContentType: contentType,
            };

            const s3Response = await s3.upload(params).promise();
            console.log(`Archivo subido a S3: ${s3Response.Location}`);

            // Actualizar la URL del documento
            if (!documento.url) {
              // Si no tenía URL, asignamos la nueva URL
              documento.url = s3Response.Location;
              console.log(`URL del documento creada: ${s3Response.Location}`);
            } else {
              // Si ya tenía URL, la actualizamos con la nueva
              documento.url = s3Response.Location;
              console.log(`URL del documento actualizada: ${s3Response.Location}`);
            }
          } catch (error) {
            console.error(`Error procesando documento con ID ${documento.contenido}:`, error);
          }
        }
      }

      // Guardar los cambios en la habilitación
      await habilitacion.save();
      console.log(`Habilitación actualizada: ${habilitacion._id}`);
    }
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    mongoose.connection.close();
  }
});

db.on('error', (err) => {
  console.error('Error en la conexión a MongoDB:', err);
});

// Función para obtener la extensión del archivo según su contentType
function mimeExtension(contentType) {
  const mimeTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    // Agregar otros tipos de MIME según sea necesario
  };

  return mimeTypes[contentType] || '.bin'; // Devuelve '.bin' por defecto si no encuentra el contentType
}
*/
