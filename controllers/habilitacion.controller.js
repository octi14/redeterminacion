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

      const promises = [];

      const agregarDocumento = async (nombreCampo, archivo) => {
        if (archivo) {
          const bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'documentos',
          });

          const options = {
            contentType: archivo.contentType, // Configurar el tipo de contenido del archivo
          };
          const uploadStream = bucket.openUploadStream(nombreCampo, options);
          const buffer = Buffer.from(archivo.data, 'base64');
          uploadStream.end(buffer);

          const promise = new Promise((resolve, reject) => {
            uploadStream.on('finish', async () => {
              const campoSinSufijo = nombreCampo.replace(`_${nroTramite}`, '');
              formData.documentos[campoSinSufijo] = uploadStream.id;
              resolve();
            });
            uploadStream.on('error', reject);
          });

          promises.push(promise);
        }
      };

      // Agregar los documentos al objeto de documentosParaGuardar
      agregarDocumento(`planillaAutorizacion_${nroTramite}`, documentos.planillaAutorizacion);
      agregarDocumento(`dniFrente_${nroTramite}`, documentos.dniFrente);
      agregarDocumento(`dniDorso_${nroTramite}`, documentos.dniDorso);
      agregarDocumento(`constanciaCuit_${nroTramite}`, documentos.constanciaCuit);
      agregarDocumento(`constanciaIngresosBrutos_${nroTramite}`, documentos.constanciaIngresosBrutos);
      agregarDocumento(`certificadoDomicilio_${nroTramite}`, documentos.certificadoDomicilio);
      agregarDocumento(`actaPersonaJuridica_${nroTramite}`, documentos.actaPersonaJuridica);
      agregarDocumento(`actaDirectorio_${nroTramite}`, documentos.actaDirectorio);
      agregarDocumento(`libreDeudaUrbana_${nroTramite}`, documentos.libreDeudaUrbana);
      agregarDocumento(`tituloPropiedad_${nroTramite}`, documentos.tituloPropiedad);
      agregarDocumento(`croquis_${nroTramite}`, documentos.croquis);
      agregarDocumento(`plano_${nroTramite}`, documentos.plano);

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

exports.deleteDocumentosById = async function (req, res) {
  try {
    const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
    // Busca la habilitación por su ID
    var habilitacion = null;
    try{
      habilitacion = await Habilitacion.findById(new mongoose.Types.ObjectId(id)).select("documentos").exec();
    }catch(e){
      console.log("Algo está mal con el ID.");
    };

    if (!habilitacion) {
      return res.status(404).json({
        message: 'La habilitación no se encontró en la base de datos.',
      });
    }

    const documentos = habilitacion.documentos.toObject(); // Convierte a un objeto Mongoose
    console.log(documentos);

    // Accede al bucket de GridFS
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'documentos',
    });

    // Itera a través de los campos de documentos y elimina cada documento asociado a la habilitación específica
    const promises = Object.keys(documentos).map(async (campo) => {
      var documentoId = null;
      if(documentos[campo] != null && campo != "_id"){
        documentoId = documentos[campo];
        // Utiliza el método delete para eliminar el documento por su ID
        await bucket.delete(documentoId);
      }
      documentos[campo] = null;
    });

    // Espera a que todas las eliminaciones se completen antes de responder

    await Promise.all(promises);

    console.log(documentos);

    // Puedes realizar cualquier otra lógica aquí, como actualizar la habilitación si es necesario


    await HabilitacionService.update(id,{
      habilitacion: {
        documentos: documentos,
      },
    })
    return res.status(200).json({
      message: 'Documentos eliminados con éxito.',
    });
  } catch (e) {
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

    const documentos = habilitacion.documentos;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'documentos',
    });

    const documentosObtenidos = {};
    const camposPermitidos = [
      'planillaAutorizacion', 'dniFrente', 'dniDorso', 'constanciaCuit',
      'constanciaIngresosBrutos', 'actaPersonaJuridica', 'actaDirectorio',
      'libreDeudaUrbana', 'tituloPropiedad', 'plano', 'certificadoDomicilio', 'croquis'
    ];

    // Usar un bucle for...of para asegurar sincronización
    for (const campo of camposPermitidos) {
      const fileId = documentos[campo];
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
          documentosObtenidos[campo] = {
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
    consolee.log("A");
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
