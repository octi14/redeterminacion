const Habilitacion = require('../models/habilitacion.model');
const HabilitacionService = require('../services/habilitacion.service');
const TicketController = require('../controllers/ticket.controller');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const AWS = require('aws-sdk');

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

exports.getAll = async function (req, res) {
  try {
    const habilitacions = await HabilitacionService.findAll();
    return res.status(200).json({
      data: habilitacions,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

const BUCKET = 'haciendagesell';

function extensionFromContentType(contentType) {
  const raw = String(contentType || 'application/octet-stream').split(';')[0].trim();
  const subtype = raw.split('/')[1] || 'bin';
  return subtype.split('+')[0] || 'bin';
}

function publicObjectUrl(key) {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Reserva nro de trámite y firma URLs PUT a S3.
 * El navegador sube los binarios directo a S3 (no pasan por la RAM del dyno).
 *
 * CORS del bucket (requerido para el PUT desde el browser), ejemplo:
 * AllowedOrigins: https://haciendavgesell.gob.ar
 * AllowedMethods: PUT, GET, HEAD
 * AllowedHeaders: Content-Type, *
 */
exports.presignDocumentos = async function (req, res) {
  try {
    const files = req.body.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        message: 'Se requiere files: [{ nombreDocumento, contentType }].',
      });
    }

    const nroTramite = await TicketController.getCurrent();
    if (nroTramite == null || typeof nroTramite === 'string') {
      return res.status(500).json({
        message: 'No se pudo reservar el número de trámite.',
      });
    }

    const uploads = files.map((file) => {
      const nombreDocumento = file.nombreDocumento;
      const contentType = file.contentType || 'application/octet-stream';
      if (!nombreDocumento) {
        throw new Error('Cada archivo requiere nombreDocumento.');
      }

      const extension = extensionFromContentType(contentType);
      const key = `mongo-backup/${nombreDocumento}_${nroTramite}.${extension}`;
      const uploadUrl = s3.getSignedUrl('putObject', {
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        Expires: 15 * 60,
      });

      return {
        nombreDocumento,
        contentType,
        key,
        uploadUrl,
        url: publicObjectUrl(key),
      };
    });

    return res.status(200).json({
      data: { nroTramite, uploads },
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

// Crea la habilitación. Los archivos ya deben estar en S3 (flujo presign + PUT).
// No acepta base64 en el body para evitar R14 por payloads enormes.
exports.add = async function (req, res) {
  try {
    const formData = req.body.habilitacion || {};
    const documentos = formData.documentos || {};
    const nroTramite = formData.nroSolicitud;

    if (nroTramite == null || nroTramite === '') {
      return res.status(400).json({
        message: 'Falta nroSolicitud. Primero solicite URLs de subida (POST /habilitaciones/presign).',
      });
    }

    formData.documentos = { documentos: [] };

    for (const campo of Object.keys(documentos)) {
      const documento = documentos[campo];
      if (!documento) continue;

      if (documento.contenido && documento.contenido.data) {
        return res.status(400).json({
          message: 'El alta con archivos en base64 ya no está soportada. Use la subida directa a S3.',
        });
      }

      if (!documento.url) {
        return res.status(400).json({
          message: `Falta url de S3 para el documento ${documento.nombreDocumento || campo}.`,
        });
      }

      formData.documentos.documentos.push({
        nombreDocumento: documento.nombreDocumento || campo,
        url: documento.url,
      });
    }

    formData.nroSolicitud = nroTramite;
    await HabilitacionService.create(formData);

    return res.status(201).json({
      message: 'Habilitación creada con éxito.',
      data: nroTramite,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};


exports.update = async (req, res) => {
  try {
    const { id } = req.params; // Suponiendo que proporcionas el ID del documento a actualizar en los parámetros de la solicitud.
    const camposActualizados = req.body; // Suponiendo que envías los campos actualizados en el cuerpo de la solicitud.

    // Encontrar el documento por ID y actualizarlo
    const documentoActualizado = await HabilitacionService.update(
      id,
      camposActualizados.habilitacion
    );

    if (!documentoActualizado) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    return res.status(200).json(documentoActualizado);
  } catch (error) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.updateLazy = async (req, res) => {
  try {
    const { id } = req.params; // Suponiendo que proporcionas el ID del documento a actualizar en los parámetros de la solicitud.
    const camposActualizados = req.body; // Suponiendo que envías los campos actualizados en el cuerpo de la solicitud.

    // Encontrar el documento por ID y actualizarlo
    const documentoActualizado = await HabilitacionService.updateLazy(
      id,
      camposActualizados.habilitacion
    );

    if (!documentoActualizado) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    return res.status(200).json(documentoActualizado);
  } catch (error) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    const { id } = req.params;
    await Habilitacion.findByIdAndDelete(id);
    return res.status(200).json({
      message: 'Habilitacion deleted.',
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getById = async function (req, res) {
  try {
    const { id } = req.params;
    const habilitacion = await Habilitacion.findById(id).select('-documentos');
    return res.status(200).json({
      data: habilitacion,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

//esta operación se hacía sobre un bucket de mongoDB atlas, ahora funciona sobre un bucket de amazon s3
exports.getDocumentosById = async (req, res) => {
  try {
    const { id } = req.params;
    const habilitacion = await Habilitacion.findById(id).select('documentos');
    const datosHab = await Habilitacion.findById(id).select('-documentos');

    if (!habilitacion) {
      return res.status(404).json({
        message: 'Habilitación no encontrada.',
      });
    }

    const documentosArray = habilitacion.documentos.documentos;
    const documentosObtenidos = {};

    for (const documento of documentosArray) {
      try {
        // Sanitización del nombre del archivo
        const sanitizedNombre = documento.nombreDocumento
        const altSanitizedNombre = documento.nombreDocumento?.replace(/\//g, '_') || 'archivo_desconocido';

        // Agregar el número de trámite al nombre del archivo
        const key = `mongo-backup/${sanitizedNombre}_${datosHab.nroSolicitud || 'tramite_desconocido'}`;

        // Buscar archivos que coincidan con el prefijo
        const listResponse = await s3.listObjectsV2({
          Bucket: 'haciendagesell',
          Prefix: key,
        }).promise();

        var newListResponse = null
        var data = null

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          // Agregar el número de trámite al nombre del archivo
          const newKey = `mongo-backup/${altSanitizedNombre}_${datosHab.nroSolicitud || 'tramite_desconocido'}`;

          // Buscar archivos que coincidan con el prefijo
          newListResponse = await s3.listObjectsV2({
            Bucket: 'haciendagesell',
            Prefix: newKey,
          }).promise();

          if(!newListResponse.Contents || newListResponse.Contents.length === 0){
            throw new Error(`No se encontraron archivos para el prefijo: ${key} ni para ${newKey}`);
          }
        }

        // Tomar el primer archivo que coincida
        if(listResponse.Contents.length > 0){
          const fileKey = listResponse.Contents[0].Key;
          // Descargar el archivo desde S3
          data = await s3.getObject({
            Bucket: 'haciendagesell',
            Key: fileKey,
          }).promise();
        }else if(newListResponse.Contents.length > 0){
          const newFileKey = newListResponse.Contents[0].Key;
          // Descargar el archivo desde S3
          data = await s3.getObject({
            Bucket: 'haciendagesell',
            Key: newFileKey,
          }).promise();
        }

        // Extraer la extensión del archivo desde el nombre
        const extension = key.split('.').pop() || 'bin';

        documentosObtenidos[documento.nombreDocumento] = {
          contentType: data.ContentType,
          data: data.Body.toString('base64'),
          filename: `${documento.nombreDocumento}.${extension}`, // Agregar la extensión al nombre del archivo
        };
      } catch (error) {
        console.error(`Error descargando archivo desde S3 para documento ${documento.nombreDocumento}:`, error.message);

        // Manejo de errores si no se encuentra el archivo
        documentosObtenidos[documento.nombreDocumento] = {
          error: `Archivo no encontrado en S3.`,
        };
      }
    }

    return res.status(200).json({
      data: documentosObtenidos,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};


exports.getByNroTramite = async function (req, res) {
  try {
    const { nroTramite } = req.body;
    const habilitacion = await Habilitacion.findOne({ 'nroSolicitud': nroTramite }).select('-documentos');
    return res.status(200).json({
      data: habilitacion,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Error" + e.message,
    });
  }
};

exports.getAprobados = async function (req, res) {
  try {
    const { status } = req.body;
    const habilitaciones = await Habilitacion.find({ 'status': status }).select('-documentos');
    return res.status(200).json({
      data: habilitaciones,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Error" + e.message,
    });
  }
};

exports.getByTipoSolicitud = async function (req, res) {
  try {
    const { tipoSolicitud } = req.params;
    const habilitacions = await Habilitacion.find({ 'solicitante.tipoSolicitud': tipoSolicitud }).select('-documentos');
    return res.status(200).json({
      data: habilitacions,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

/* se usó una sola vez para mantener la referencia de los documentos cambiando de model.
   actualmente los documentos están en amazon s3, y esto dejaría de servir.
exports.migrarHabilitacion = async function (req, res) {
  try {
    const { id } = req.params;
    const habilitacion = await Habilitacion.findById(id).select('documentos');

    if (!habilitacion) {
      return;
    }

    const documentosNuevos = [];

    // Copiar los datos del modelo viejo al nuevo
    // Supongamos que habilitacion.documentos es un objeto convertido a String
    let documentosString = String(habilitacion.documentos);

    // Utilizamos una expresión regular para extraer los ObjectId
    const objectIdRegex = /ObjectId\("([a-fA-F0-9]{24})"\)/g;
    let match;
    const objectIdArray = [];

    while ((match = objectIdRegex.exec(documentosString)) !== null) {
      objectIdArray.push(ObjectId(match[1]));
    }

    // Utilizamos una expresión regular para extraer los nombres de las propiedades
    const propertyNameRegex = /\s*([^\s:]+)\s*:/g;
    let othermatch;
    const propertyNames = [];

    while ((othermatch = propertyNameRegex.exec(documentosString)) !== null) {
      const propertyName = othermatch[1];
      if (propertyName !== '_id' && propertyName !== 'documentos') {
          propertyNames.push(propertyName);
      }
    }

    for( var i = 0; i < propertyNames.length; i++){
      documentosNuevos.push({ nombreDocumento: propertyNames[i], contenido: objectIdArray[i] });
    };
    // Actualiza la habilitación con el nuevo modelo
    habilitacion.documentos = {
      documentos: documentosNuevos,
    };
    await habilitacion.save();
    // Devuelve un código de estado 200 si la migración fue exitosa
    return res.status(200).json({
       message: 'Migración completada para la habilitación con ID:' + habilitacion._id,
       data: habilitacion
    });
  } catch (error) {
      return res.status(500).json({
         message: 'Error en la migración:' + String(error)
      })
  }
};*/

// Elimina los documentos de la habilitación: borra en S3 si tienen url; limpia referencias en MongoDB.
function s3KeyFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] === 'haciendagesell' ? parts.slice(1).join('/') : pathname.replace(/^\//, '');
  } catch (_) {
    return null;
  }
}

exports.deleteDocumentosById = async function (req, res) {
  try {
    const { id } = req.params;
    let habilitacion;
    try {
      habilitacion = await Habilitacion.findById(new mongoose.Types.ObjectId(id)).select('documentos').exec();
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    if (!habilitacion) {
      return res.status(404).json({ message: 'La habilitación no se encontró en la base de datos' });
    }

    const documentos = habilitacion.documentos.documentos.toObject();

    const promises = Object.keys(documentos).map(async (campo) => {
      if (campo === '_id') return;
      const doc = documentos[campo];
      if (!doc) return;

      if (doc.url) {
        const key = s3KeyFromUrl(doc.url);
        if (key) {
          try {
            await s3.deleteObject({ Bucket: 'haciendagesell', Key: key }).promise();
          } catch (e) {
            console.log(`Error borrando en S3 key ${key}:`, e.message);
          }
        }
      }
      documentos[campo] = null;
    });

    await Promise.all(promises);

    habilitacion.documentos.documentos = documentos;
    await habilitacion.save();

    return res.status(200).json({ message: 'Documentos eliminados con éxito.' });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};
