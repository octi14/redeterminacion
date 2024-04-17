const AbiertoAnual = require('../models/abiertoAnual.model'); // Asumiendo que has creado este modelo
const AbiertoAnualService = require('../services/abiertoAnual.service');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
// Configuración de GridFsStorage para guardar en un bucket 'facturas'
const storage = new GridFsStorage({
  url: 'mongodb+srv://octi14:octavio14@tiendacluster.1zpsi.mongodb.net/test?authSource=admin&replicaSet=atlas-7lljh4-shard-0&readPreference=primary&ssl=true', // Reemplaza por la URL de tu base de datos
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: 'facturas', // Cambia 'documentos' por 'facturas'
      filename: file.originalname, // Usa el nombre original del archivo
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 48 * 1024 * 1024 } // Limita el tamaño del archivo a 5MB
});

// Ejemplo de método para añadir un documento a un registro de AbiertoAnual
exports.addDocument = async function(req, res) {
    // Utilizar multer para manejar los archivos PDF adjuntos
    const upload = multer({
      storage, // Utiliza el almacenamiento de GridFS configurado previamente
      limits: {
        fileSize: 48 * 1024 * 1024, // 5 MB
      },
    });
  const { id } = req.params; // ID del registro AbiertoAnual

  upload.single('factura')(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json({ message: "Error al subir el archivo: " + err.message });
    } else if (err) {
      return res.status(500).json({ message: "Error del servidor al subir archivo" });
    }

    try {
      const abiertoAnual = await AbiertoAnual.findById(id);
      if (!abiertoAnual) {
        return res.status(404).json({ message: 'Registro no encontrado' });
      }

      // Suponiendo que 'contenido' en facturas debe almacenar el ID del archivo en GridFS
      if (!abiertoAnual.facturas) {
        abiertoAnual.facturas = [];
      }

      abiertoAnual.facturas.push({
        contenido: new mongoose.Types.ObjectId(req.file.id) // Guarda el ID del archivo subido
      });

      await abiertoAnual.save();
      res.status(201).json({ message: 'Factura añadida correctamente', facturaId: req.file.id });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
};

exports.getAll = async function (req, res) {
  try {
    const tramites = await AbiertoAnualService.findAll();
    return res.status(200).json({
      data: tramites,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function(req, res) {
  try {
    const createdAbiertoAnual = await AbiertoAnualService.create(req.body);
    res.status(201).json({
        message: 'Registro de abiertoAnual creado con éxito',
        data: createdAbiertoAnual
    });
  } catch (e) {
      res.status(400).json({ message: e.message });
  }
};

exports.getById = async function (req, res) {
  try {
    const { id } = req.params;
    const tramite = await AbiertoAnual.findById(id).select('-facturas');
    return res.status(200).json({
      data: tramite,
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

    const documentosArray = tramite.facturas.facturas;
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


exports.deleteFacturasById = async function (req, res) {
  try {
    const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
    // Busca la habilitación por su ID
    var tramite = null;
    try{
      tramite = await AbiertoAnual.findById(new mongoose.Types.ObjectId(id)).select("facturas").exec();
    }catch(e){
      console.log("Algo está mal con el ID.");
    };

    if (!tramite) {
      return res.status(404).json({
        message: 'La habilitación no se encontró en la base de datos.',
      });
    }

    const facturas = tramite.facturas.toObject(); // Convierte a un objeto Mongoose
    console.log(facturas);

    // Accede al bucket de GridFS
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'facturas',
    });

    // Itera a través de los campos de documentos y elimina cada documento asociado a la habilitación específica
    const promises = Object.keys(documentos).map(async (campo) => {
      var documentoId = null;
      if(facturas[campo] != null && campo != "_id"){
        documentoId = facturas[campo];
        // Utiliza el método delete para eliminar el documento por su ID
        try{
          await bucket.delete(documentoId);
        }catch(e){
          console.log("Error tratando de borrar el documento " + documentoId);
        }
      }
      facturas[campo] = null;
    });

    // Espera a que todas las eliminaciones se completen antes de responder

    await Promise.all(promises);

    console.log(facturas);

    // Actualiza la referencia de documentos en la instancia de habilitacion
    tramite.facturas = facturas;

    // Guarda la instancia actualizada en la base de datos
    await tramite.save();

    return res.status(200).json({
      message: 'Documentos eliminados con éxito.',
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
