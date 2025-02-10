const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const AWS = require('aws-sdk');
const readline = require('readline');
const Habilitacion = require('../models/habilitacion.model');
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, MONGO_URL } = require('../config');

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const S3_BUCKET_NAME = 'haciendagesell';
const GRIDFS_BUCKET_NAME = 'documentos';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.once('open', async () => {
  console.log('Conectado a MongoDB');
  const bucket = new GridFSBucket(db.db, { bucketName: GRIDFS_BUCKET_NAME });

  try {
    const habilitaciones = await Habilitacion.find({ 'documentos.documentos.contenido': { $exists: true } });


    //No hay habilitaciones (solo en caso de falsa conexión)
    if (!habilitaciones.length) {
      console.log('No hay documentos con contenido en GridFS para migrar.');
      return;
    }

    //buscar en cada habilitación
    for (const habilitacion of habilitaciones) {
      console.log("🔍 Analizando archivos de la habilitación " + habilitacion.nroSolicitud + ":");
      await wait(500);
      if (!habilitacion.documentos || !habilitacion.documentos.documentos.length) {
        console.log(`La habilitación ${habilitacion.nroSolicitud} no tiene documentos.`);
        continue;
      }

      const extensionesSet = new Set();
      let tieneArchivosDesconocidos = false;
      let archivosNoArreglables = [];
      let docsOriginales = []

      for (const documento of habilitacion.documentos.documentos) {
        if (!documento.contenido){
          console.log(`⚠️   El documento ${documento.nombreDocumento + "_" + habilitacion.nroSolicitud} no tiene un campo llamado contenido o este es null.`);
          continue;
        }

        const fileId = documento.contenido;
        const file = await bucket.find({ _id: fileId }).toArray();

        if (!file.length) {
          console.log(`⚠️   El documento ${documento.nombreDocumento + "_" + habilitacion.nroSolicitud} tiene un campo llamado contenido, y tiene un ID, pero el archivo ya no se encuentra en GridFS.`);
          continue;
        }

        const filename = file[0].filename || 'SIN NOMBRE';
        const contentType = file[0].contentType || 'application/octet-stream';
        const fileExtension = mimeExtension(contentType);
        extensionesSet.add(fileExtension);

        console.log(`Archivo encontrado en Mongodb: ${filename} (${contentType}) -> Extensión: ${fileExtension}`);

        if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(fileExtension)) {
          tieneArchivosDesconocidos = true;
        }

        if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(fileExtension)) {
          archivosNoArreglables.push({ nombre: filename, extension: fileExtension, contentType: contentType });
        }
      }

      if (archivosNoArreglables.length > 0) {
        console.log(`⚠️ La habilitación ${habilitacion.nroSolicitud} tiene archivos que no se pueden arreglar:`);
        archivosNoArreglables.forEach(({ nombre, extension, contentType }) => {
          console.log(`   - ${nombre} (Extensión: ${extension || 'SIN EXTENSIÓN'}) (Tipo de archivo: ${contentType || 'SIN TIPO'})`);
        });

        await wait(100);
        const cancelar = await preguntar(`Presiona cualquier tecla para dejar todo como está con esta habilitación: `);
        if (!cancelar) {
          console.log(`⏩ Saltando la habilitación ${habilitacion.nroSolicitud} sin hacer cambios.`);
          await wait(100);
          continue;
        }
      }

      if (!tieneArchivosDesconocidos) {
        console.log(`✅ La habilitación ${habilitacion.nroSolicitud} tiene archivos de los siguientes tipos: ${[...extensionesSet].filter(ext => ext !== '.bin').join(', ')}.`);
      } else {
        const confirmarActualizacion = await preguntar(`Hay archivos con extensiones desconocidas. ¿Subirlos corregidos a S3? (S/N): `);
        if (confirmarActualizacion) {
          for (const documento of habilitacion.documentos.documentos) {
            if (!documento.contenido) continue;

            const fileId = documento.contenido;
            const file = await bucket.find({ _id: fileId }).toArray();
            if (!file.length) continue;

            const contentType = file[0].contentType || 'application/octet-stream';
            const fileExtension = mimeExtension(contentType);

            if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(fileExtension)) {
              const fileBuffer = await descargarArchivo(bucket, fileId);
              const params = {
                Bucket: S3_BUCKET_NAME,
                Key: `mongo-backup/${file[0].filename.replace(/\//g, '_')}${fileExtension}`,
                Body: fileBuffer,
                ContentType: contentType,
              };

              const s3Response = await s3.upload(params).promise();
              documento.url = s3Response.Location;
              console.log(`✅  Archivo corregido y subido a S3: ${s3Response.Location}`);
            }
          }
        }
      }

      let confirmarBorrado = false
      for(const documento of habilitacion.documentos.documentos){
        if(documento.contenido && documento.contenido != null){
          docsOriginales.push(documento.contenido)
        }
      }
      if(docsOriginales.length > 0){
        console.log("Hay " + docsOriginales.length + " archivos para borrar.");
        confirmarBorrado = await preguntar(`¿Borrar los archivos de GridFS para la habilitación ${habilitacion.nroSolicitud}? (S/N): `);
      }else{
        console.log(`⚠️  La habilitación ${habilitacion.nroSolicitud} no tiene documentos para corregir.`);
        await wait(100)
      }

      let checkGuardado = false
      if (confirmarBorrado) {
        checkGuardado = await borrarArchivosGridFS(habilitacion, bucket, docsOriginales);
      }else{
        console.log("➡️  Se continuará analizando la siguiente habilitación.");
        await wait(500);
      }

      if(checkGuardado){
        const confirmarGuardado = await preguntar(`¿Guardar cambios en la habilitación ${habilitacion.nroSolicitud}? (S/N): `);
        if (confirmarGuardado) {
          await habilitacion.save();
          console.log(`✔️  Cambios guardados para la habilitación ${habilitacion.nroSolicitud}.`);
        }
      }else{
        console.log(`⚠️  No se modificó la habilitación ${habilitacion.nroSolicitud}.`);
      }
    }
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    mongoose.connection.close();
    rl.close();
  }
});

db.on('error', (err) => console.error('Error en la conexión a MongoDB:', err));

function mimeExtension(contentType) {
  const mimeTypes = {
    // Imágenes
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
    'image/tiff': '.tiff',
    'image/x-icon': '.ico',
    'image/heic': '.heic',

    // Documentos
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/rtf': '.rtf',

    // Archivos comprimidos
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'application/gzip': '.gz',
    'application/x-tar': '.tar',

    // Audio
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
    'audio/x-m4a': '.m4a',

    // Video
    'video/mp4': '.mp4',
    'video/mpeg': '.mpeg',
    'video/ogg': '.ogv',
    'video/webm': '.webm',
    'video/x-msvideo': '.avi',
    'video/x-ms-wmv': '.wmv',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',

    // Código y archivos web
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/json': '.json',
    'application/xml': '.xml',
    'application/x-sh': '.sh',
    'application/x-httpd-php': '.php',
    'application/java-archive': '.jar',

    // Otros
    'application/octet-stream': '.bin', // Tipo genérico
    'application/x-msdownload': '.exe', // Ejecutables en Windows
    'application/x-iso9660-image': '.iso', // Imágenes de disco
  };

  return mimeTypes[contentType] || '.bin';
}

async function descargarArchivo(bucket, fileId) {
  const chunks = [];
  const downloadStream = bucket.openDownloadStream(fileId);
  return new Promise((resolve, reject) => {
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    downloadStream.on('error', reject);
  });
}

async function verificarArchivosEnS3(habilitacion) {
  let todosMigrados = true;

  for (const documento of habilitacion.documentos.documentos) {
    if (documento.contenido) {
      console.log(`🔍 Verificando ${documento.nombreDocumento} en S3...`);

      if (!documento.url) {
        console.log(`⚠️ El documento ${documento.nombreDocumento} no tiene URL en S3.`);
        todosMigrados = false;
        continue;
      }

      try {
        // Obtener la Key correcta desde la URL
        const urlParts = new URL(documento.url);
        const key = decodeURIComponent(urlParts.pathname.substring(1));

        // Verificar si el archivo existe en S3 con headObject
        await s3.headObject({
          Bucket: S3_BUCKET_NAME,
          Key: key
        }).promise();

        console.log(`✅ El archivo ${documento.nombreDocumento} existe en S3`);
      } catch (error) {
        console.log(`❌ No se encontró ${documento.nombreDocumento} en S3`);
        todosMigrados = false;
      }
    }
  }

  return todosMigrados;
}

async function borrarArchivosGridFS(habilitacion, bucket, docsOriginales , habilitacionModel) {
  console.log("Verificando existencia de los archivos en s3...");
  const archivosMigrados = await verificarArchivosEnS3(habilitacion);
  let huboCambios = false;

  if (!archivosMigrados) {
    console.log(`❌ No se eliminarán los archivos de GridFS porque hubo problemas para corregir los errores.`);
    console.log("➡️  Se continuará automáticamente a la siguiente habilitación.")
    await wait(500);
    return huboCambios;
  }

  for (const documento of habilitacion.documentos.documentos) {
    if (documento.contenido) {
      console.log(`Se encontró información de ${documento.nombreDocumento} en GridFS en las referencias de la habilitación.`)
      try {
        let pregunta = await preguntar(`Eliminar archivo en GridFS en la habilitación ${habilitacion.nroSolicitud}? (S/N): `);
        if(pregunta){
          await bucket.delete(documento.contenido);
          console.log(`✅ Archivo con ID ${documento.contenido} eliminado de GridFS.`);
          // Limpiar la referencia en el documento
          documento.contenido = null;
          huboCambios = true;
        }
      } catch (error) {
        if (error.message.includes('File not found')) {
          console.log(`⚠️ No se encontró el archivo con ID ${documento.contenido}.`);
          let respuesta = await preguntar(`⚠️  ¿Querés eliminar la referencia al archivo en la habilitación? (S/N): `)
          if(respuesta){
            // Limpiar la referencia en el documento
            documento.contenido = null;
            console.log(`✅ Referencia de archivo eliminada de la habilitación.`);
            huboCambios = true
          }
        } else {
          console.log(`❌ Error eliminando documento ${documento.contenido} de GridFS:`, error);
        }
      }
    }
  }

  // Guardar la habilitación actualizada solo si hubo cambios
  if (huboCambios) {
    try {
      await Habilitacion.findByIdAndUpdate(habilitacion._id, { documentos: habilitacion.documentos });
      console.log(`✅ Habilitación ${habilitacion._id} actualizada: referencias de GridFS eliminadas.`);
    } catch (error) {
      console.error(`❌ Error actualizando la habilitación ${habilitacion._id}:`, error);
    }
  }else{
    console.log(`❌ No hubo cambios en la habilitación ${habilitacion.nroSolicitud}.`)
  }
  return huboCambios
}


function preguntar(pregunta) {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta.trim().toUpperCase() !== 'N');
    });
  });
}

async function wait(ms){
  return await new Promise(resolve => setTimeout(resolve, ms));
}
