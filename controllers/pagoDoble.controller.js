const PagoDoble = require('../models/pagoDoble.model');
const PagoDobleService = require('../services/pagoDoble.service');
const TicketRecaudacionesController = require('../controllers/ticketRecaudaciones.controller');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const AWS = require('aws-sdk');


// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3storage = multer.memoryStorage();  // Usamos almacenamiento en memoria con Multer

// Configurar el storage para multer (opcional)
exports.getAll = async function (req, res) {
  try {
    const pagoDobles = await PagoDobleService.findAll();
    return res.status(200).json({
      data: pagoDobles,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

//esta operación crea una instancia de pagoDoble y guarda sus documentos en un bucket de amazon s3.
exports.add = async function (req, res) {
  try {
    const upload = multer({
      s3storage,
      limits: {
        fileSize: 48 * 1024 * 1024, // 48 MB
      },
    });

    upload.array('archivo', 10)(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        if (!res.headersSent) {
          return res.status(400).json({
            message: 'Error al cargar el archivo.',
          });
        }
      } else if (err) {
        if (!res.headersSent) {
          return res.status(500).json({
            message: 'Error interno del servidor.',
          });
        }
      }

      const nroTramite = await TicketRecaudacionesController.getCurrent();
      const documentos = req.body.pagoDoble.documentos || {};
      const formData = req.body.pagoDoble;
      formData.documentos = { documentos: [] };

      const promises = [];

      const agregarDocumento = async (nombreDocumento, documento, nroTramite) => {
        if (documento && documento.contenido) {
          // Determinar la extensión basándonos en el ContentType
          const contentType = documento.contenido.contentType; // Ejemplo: 'application/pdf'
          const extension = contentType.split('/')[1]; // Ejemplo: 'pdf'

          // Crear el nombre del archivo con la extensión
          const nombreArchivo = `${nombreDocumento}_${nroTramite}.${extension}`;

          // Convertir el archivo de base64 a buffer
          const buffer = Buffer.from(documento.contenido.data, 'base64');

          const params = {
            Bucket: 'haciendagesell',
            Key: `pagos-dobles/${nombreArchivo}`, // Usar el nombre con la extensión
            Body: buffer,
            ContentType: contentType,
            // No es necesario usar ContentType aquí, ya que no lo estamos configurando explícitamente
          };

          try {
            const data = await s3.upload(params).promise();
            const fileUrl = data.Location; // URL pública del archivo subido

            formData.documentos.documentos.push({
              nombreDocumento: nombreDocumento,
              url: fileUrl,
            });
          } catch (error) {
            console.error('Error subiendo archivo a S3:', error.message);
            if (!res.headersSent) {
              return res.status(500).json({
                message: 'Error subiendo el archivo a S3.',
              });
            }
          }
        }
      };

      // Procesar todos los documentos
      for (const nombreDocumento in documentos) {
        if (documentos.hasOwnProperty(nombreDocumento)) {
          const documento = documentos[nombreDocumento];
          promises.push(agregarDocumento(documento.nombreDocumento, documento, nroTramite));
        }
      }

      await Promise.all(promises);

      formData.nroSolicitud = nroTramite;
      const createdPagoDoble = await PagoDobleService.create(formData);

      if (!res.headersSent) {
        return res.status(201).json({
          message: 'éxito.',
          data: nroTramite,
        });
      }
    });
  } catch (e) {
    if (!res.headersSent) {
      return res.status(400).json({
        message: e.message,
      });
    }
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params; // Suponiendo que proporcionas el ID del documento a actualizar en los parámetros de la solicitud.
    const camposActualizados = req.body; // Suponiendo que envías los campos actualizados en el cuerpo de la solicitud.

    // Encontrar el documento por ID y actualizarlo
    const documentoActualizado = await PagoDobleService.update(
      id,
      camposActualizados.pago
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
    const documentoActualizado = await PagoDobleService.updateLazy(
      id,
      camposActualizados.pagoDoble
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
    await PagoDoble.findByIdAndDelete(id);
    return res.status(200).json({
      message: 'PagoDoble deleted.',
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
    const pagoDoble = await PagoDoble.findById(id).select('-documentos');
    return res.status(200).json({
      data: pagoDoble,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getDocumentosById = async (req, res) => {
  try {
    const { id } = req.params;
    const pagoDoble = await PagoDoble.findById(id).select('documentos');
    const datosHab = await PagoDoble.findById(id).select('-documentos');

    if (!pagoDoble) {
      return res.status(404).json({
        message: 'no encontrada.',
      });
    }

    const documentosArray = pagoDoble.documentos.documentos;
    const documentosObtenidos = {};

    for (const documento of documentosArray) {
      try {
        // Sanitización del nombre del archivo
        const sanitizedNombre = documento.nombreDocumento
        const altSanitizedNombre = documento.nombreDocumento?.replace(/\//g, '_') || 'archivo_desconocido';

        // Agregar el número de trámite al nombre del archivo
        const key = `pagos-dobles/${sanitizedNombre}_${datosHab.nroSolicitud || 'tramite_desconocido'}`;

        // Buscar archivos que coincidan con el prefijo
        const listResponse = await s3.listObjectsV2({
          Bucket: 'haciendagesell',
          Prefix: key,
        }).promise();

        var newListResponse = null
        var data = null

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          // Agregar el número de trámite al nombre del archivo
          const newKey = `pagos-dobles/${altSanitizedNombre}_${datosHab.nroSolicitud || 'tramite_desconocido'}`;

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
    const pagoDoble = await PagoDoble.findOne({ 'nroSolicitud': nroTramite }).select('-documentos');
    return res.status(200).json({
      data: pagoDoble,
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
    const pagoDoblees = await PagoDoble.find({ 'status': status }).select('-documentos');
    return res.status(200).json({
      data: pagoDoblees,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Error" + e.message,
    });
  }
};

//to do: modificarlo para funcionar con s3
// exports.deleteDocumentosById = async function (req, res) {
//   try {
//     const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
//     // Busca la habilitación por su ID
//     var pagoDoble = null;
//     try{
//       pagoDoble = await pagoDoble.findById(new mongoose.Types.ObjectId(id)).select("documentos").exec();
//     } catch(e) {
//       return res.status(400).json({
//         message: e.message,
//       });
//     }

//     if (!pagoDoble) {
//       return res.status(404).json({
//         message: 'La habilitación no se encontró en la base de datos',
//       });
//     }

//     const documentos = pagoDoble.documentos.documentos.toObject(); // Convierte a un objeto Mongoose

//     // Accede al bucket de GridFS
//     const bucket = new GridFSBucket(mongoose.connection.db, {
//       bucketName: 'documentos',
//     });

//     // Itera a través de los campos de documentos y elimina cada documento asociado a la habilitación específica
//     const promises = Object.keys(documentos).map(async (campo) => {
//       let documentoId = documentos[campo].contenido;
//       if (documentoId && campo !== "_id") {
//         try {
//           await bucket.delete(documentoId);
//           documentos[campo] = null; // Marca el documento como eliminado
//         } catch (e) {
//           console.log(`Error tratando de borrar el documento ${documentoId}`);
//         }
//       }
//     });

//     // Espera a que todas las eliminaciones se completen antes de responder
//     await Promise.all(promises);

//     // Actualiza la referencia de documentos en la instancia de habilitacion
//     habilitacion.documentos.documentos = documentos;

//     // Guarda la instancia actualizada en la base de datos
//     await habilitacion.save();

//     return res.status(200).json({
//       message: 'Documentos eliminados con éxito.',
//     });
//   } catch (e) {
//     return res.status(400).json({
//       message: e.message,
//     });
//   }
// };
