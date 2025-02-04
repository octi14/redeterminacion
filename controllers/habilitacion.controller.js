const Habilitacion = require('../models/habilitacion.model');
const HabilitacionService = require('../services/habilitacion.service');
const TicketController = require('../controllers/ticket.controller');
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

// Crear una nueva instancia de GridFsStorage con la conexión de Mongoose
const storage = new GridFsStorage({
  url: 'mongodb+srv://octi14:octavio14@tiendacluster.1zpsi.mongodb.net/test?authSource=admin&replicaSet=atlas-7lljh4-shard-0&readPreference=primary&ssl=true', // Reemplaza por la URL de tu base de datos
  options: { useNewUrlParser: true, useUnifiedTopology: true }, // Asegúrate de utilizar las mismas opciones que en la conexión de Mongoose
  file: (req, file) => {
    return {
      bucketName: 'documentos', // Nombre del bucket donde se almacenarán los archivos
      filename: file.originalname, // Usa el nombre original del archivo
    };
  },
});

const s3storage = multer.memoryStorage();  // Usamos almacenamiento en memoria con Multer


// Configurar el storage para multer (opcional)
// const storage = multer.memoryStorage(); // Almacenar los archivos en memoria como Buffers
const upload = multer({
   storage,
   limits: {
    fileSize: 48 * 1024 * 1024, // 5 MB
  }, });

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

//esta operación crea una instancia de Habilitacion y guarda sus documentos en un bucket de amazon s3.
//anteriormente guardaba los archivos en un bucket de mongoDB atlas
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

      const nroTramite = await TicketController.getCurrent();
      const documentos = req.body.habilitacion.documentos || {};
      const formData = req.body.habilitacion;
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
            Key: `mongo-backup/${nombreArchivo}`, // Usar el nombre con la extensión
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
      const createdHabilitacion = await HabilitacionService.create(formData);

      if (!res.headersSent) {
        return res.status(201).json({
          message: 'Habilitación creada con éxito.',
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

//to do: modificarlo para funcionar con s3
exports.deleteDocumentosById = async function (req, res) {
  try {
    const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
    // Busca la habilitación por su ID
    var habilitacion = null;
    try{
      habilitacion = await Habilitacion.findById(new mongoose.Types.ObjectId(id)).select("documentos").exec();
    } catch(e) {
      return res.status(400).json({
        message: e.message,
      });
    }

    if (!habilitacion) {
      return res.status(404).json({
        message: 'La habilitación no se encontró en la base de datos',
      });
    }

    const documentos = habilitacion.documentos.documentos.toObject(); // Convierte a un objeto Mongoose

    // Accede al bucket de GridFS
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'documentos',
    });

    // Itera a través de los campos de documentos y elimina cada documento asociado a la habilitación específica
    const promises = Object.keys(documentos).map(async (campo) => {
      let documentoId = documentos[campo].contenido;
      if (documentoId && campo !== "_id") {
        try {
          await bucket.delete(documentoId);
          documentos[campo] = null; // Marca el documento como eliminado
        } catch (e) {
          console.log(`Error tratando de borrar el documento ${documentoId}`);
        }
      }
    });

    // Espera a que todas las eliminaciones se completen antes de responder
    await Promise.all(promises);

    // Actualiza la referencia de documentos en la instancia de habilitacion
    habilitacion.documentos.documentos = documentos;

    // Guarda la instancia actualizada en la base de datos
    await habilitacion.save();

    return res.status(200).json({
      message: 'Documentos eliminados con éxito.',
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
