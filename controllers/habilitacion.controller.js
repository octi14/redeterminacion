const Habilitacion = require('../models/habilitacion.model');
const HabilitacionService = require('../services/habilitacion.service');
const TicketController = require('../controllers/ticket.controller');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
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

exports.add = async function (req, res) {
  try {
    // Utilizar multer para manejar los archivos PDF adjuntos
    const upload = multer({
      storage, // Utiliza el almacenamiento de GridFS configurado previamente
      limits: {
        fileSize: 48 * 1024 * 1024, // 5 MB
      },
    });

    // Utilizar multer para manejar los archivos PDF adjuntos
    upload.single('archivo')(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        console.log('Error de Multer:', err);
        return res.status(400).json({
          message: 'Error al cargar el archivo PDF.',
        });
      } else if (err) {
        console.log('Error:', err);
        return res.status(500).json({
          message: 'Error interno del servidor.',
        });
      }

      const nroTramite = await TicketController.getCurrent();
      const documentos = req.body.habilitacion.documentos || {};
      const formData = req.body.habilitacion;
      formData.documentos = {
        documentos: [],
      }

      const promises = [];

      const agregarDocumento = async (nombreDocumento, documento, nroTramite) => {
        if (documento && documento.contenido) {
          const bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'documentos',
          });

          const options = {
            contentType: documento.contenido.contentType, // Usar el tipo de contenido proporcionado
          };

          const buffer = Buffer.from(documento.contenido.data, 'base64'); // Convertir de base64 a buffer

          const nombreArchivo = `${nombreDocumento}_${nroTramite}`; // Agregar el número de trámite al nombre del archivo

          const uploadStream = bucket.openUploadStream(nombreArchivo, options);
          uploadStream.end(buffer);

          const promise = new Promise((resolve, reject) => {
            uploadStream.on('finish', async () => {
              formData.documentos.documentos.push({
                nombreDocumento: nombreDocumento,
                contenido: uploadStream.id,
              });
              resolve();
            });
            uploadStream.on('error', reject);
          });

          promises.push(promise);
        }
      };

      for (const nombreDocumento in documentos) {
        if (documentos.hasOwnProperty(nombreDocumento)) {
          const documento = documentos[nombreDocumento];
          agregarDocumento(documento.nombreDocumento, documento, nroTramite);
        }
      }

      await Promise.all(promises);

      formData.nroSolicitud = nroTramite;
      const createdHabilitacion = await HabilitacionService.create(formData);
      return res.status(201).json({
        message: 'Created',
        data: nroTramite,
      });
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

exports.getDocumentosById = async (req, res) => {
  try {
    const { id } = req.params;
    const habilitacion = await Habilitacion.findById(id).select('documentos');

    if (!habilitacion) {
      return res.status(404).json({
        message: 'Habilitación no encontrada.',
      });
    }

    const documentosArray = habilitacion.documentos.documentos;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'documentos',
    });

    const documentosObtenidos = {};

    // Usar un bucle for...of para asegurar sincronización
    for (const documento of documentosArray) {
      const fileId = documento.contenido;
      if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
        const downloadStream = bucket.openDownloadStream(fileId);
        const chunks = [];

        await new Promise((resolve, reject) => {
          downloadStream.on('data', chunk => chunks.push(chunk));
          downloadStream.on('error', reject);
          downloadStream.on('end', resolve);
        });

        const buffer = Buffer.concat(chunks);
        const file = await bucket.find({ _id: mongoose.Types.ObjectId(fileId) }).next();
        if (file) {
          documentosObtenidos[documento.nombreDocumento] = {
            contentType: file.contentType,
            data: buffer.toString('base64'), // Codificar en base64 aquí
            filename: file.filename,
          };
        }
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

exports.migrarHabilitacion = async function (req, res) {
  try {
    const { id } = req.params;
    const habilitacion = await Habilitacion.findById(id).select('documentos');

    if (!habilitacion) {
      console.log('Habilitación no encontrada');
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
};

exports.deleteDocumentosById = async function (req, res) {
  try {
    const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
    // Busca la habilitación por su ID
    var habilitacion = null;
    try{
      habilitacion = await Habilitacion.findById(new mongoose.Types.ObjectId(id)).select("documentos").exec();
    } catch(e) {
      console.log("Algo está mal con el ID.");
      return res.status(400).json({
        message: e.message,
      });
    }

    if (!habilitacion) {
      return res.status(404).json({
        message: 'La habilitación no se encontró en la base de datos.',
      });
    }

    const documentos = habilitacion.documentos.documentos.toObject(); // Convierte a un objeto Mongoose
    console.log(documentos);

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

    console.log(documentos);

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

