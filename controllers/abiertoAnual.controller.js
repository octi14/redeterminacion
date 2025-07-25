const AbiertoAnual = require('../models/abiertoAnual.model'); // Asumiendo que has creado este modelo
const AbiertoAnualService = require('../services/abiertoAnual.service');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const AWS = require('aws-sdk');

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

// Configuración AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // definilo en tu .env
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // definilo en tu .env
  region: process.env.AWS_REGION, // o la que estés usando
});

// Método para añadir documento a AbiertoAnual y guardarlo en S3
exports.addDocument = async function (req, res) {
  try {
    const { id } = req.params;
    const { periodo } = req.body;
    const documento = req.body.factura;

    if (!documento || !documento.contenido || !documento.contenido.data || !documento.contenido.contentType) {
      return res.status(400).json({ message: 'Faltan datos del documento' });
    }

    // Buscar el registro
    const abiertoAnual = await AbiertoAnual.findById(id);
    if (!abiertoAnual) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    // Si ya hay un documento cargado en esa posición, lo eliminamos de S3
    if (abiertoAnual.facturas && abiertoAnual.facturas[periodo] && abiertoAnual.facturas[periodo].url) {
      const keyAnterior = abiertoAnual.facturas[periodo].url.split('/').pop();
      const paramsDelete = {
        Bucket: 'haciendagesell',
        Key: `abierto-anual/${keyAnterior}`
      };
      try {
        await s3.deleteObject(paramsDelete).promise();
      } catch (err) {
        console.log('No se pudo eliminar archivo anterior de S3:', err.message);
      }
    }

    // Armar el nuevo archivo
    const cuit = abiertoAnual.cuit? abiertoAnual.cuit : '';
    const nroLegajo = abiertoAnual.nroLegajo;
    const contentType = documento.contenido.contentType;
    const extension = contentType.split('/')[1]; // Ejemplo: 'pdf'
    // Crear el nombre de archivo usando la estructura proporcionada
    const nombreArchivo = `abierto-anual/${cuit}_${nroLegajo}_${periodo}.${extension}`;
    const buffer = Buffer.from(documento.contenido.data, 'base64');

    const paramsUpload = {
      Bucket: 'haciendagesell',
      Key: nombreArchivo, // Ruta con la carpeta 'abierto-anual/'
      Body: buffer,
      ContentType: contentType,
    };

    const uploadResult = await s3.upload(paramsUpload).promise();

    // Guardar en la base de datos
    abiertoAnual.facturas[periodo] = {
      url: uploadResult.Location
    };
    abiertoAnual.fechasCarga[periodo] = new Date();
    abiertoAnual.status[periodo] = 'En revisión';

    await abiertoAnual.save();

    return res.status(201).json({ message: 'Factura subida correctamente.' });
  } catch (error) {
    console.error('Error al subir factura:', error);
    return res.status(500).json({ message: 'Error al subir la factura.' });
  }
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
    const tramite = await AbiertoAnual.findById(id);
    return res.status(200).json({
      data: tramite,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByCuitLegajo = async function (req, res) {
  try {
    const { cuit } = req.params;
    const { nroLegajo } = req.body;

    // Convertir cuit a número
    const cuitNumber = Number(cuit);

    if (isNaN(cuitNumber)) {
      return res.status(400).json({
        message: "CUIT inválido",
      });
    }

    const tramite = await AbiertoAnual.findOne({ cuit: cuitNumber, nroLegajo: nroLegajo });

    if (!tramite) {
      return res.status(200).json({
        data: [],
      });
    }

    return res.status(200).json({
      data: tramite,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Error: " + e.message,
    });
  }
};

exports.getFacturasById = async (req, res) => {
  try {
    const { id } = req.params;
    const tramite = await AbiertoAnual.findById(id).select('facturas');
    const datosTramite = await AbiertoAnual.findById(id).select('-facturas');

    if (!tramite) {
      return res.status(404).json({
        message: 'Trámite no encontrado.',
      });
    }

    const facturasObj = tramite.facturas || {};
    const documentosObtenidos = {};

    for (const [periodo, factura] of Object.entries(facturasObj)) {
      try {
        // El nombre de la carpeta y prefijo para el archivo
        const prefix = `abierto-anual/${datosTramite.cuit}_${datosTramite.nroLegajo}_${periodo}`;

        // Buscar archivos que coincidan con ese prefijo en la carpeta 'abierto-anual'
        const listResponse = await s3.listObjectsV2({
          Bucket: 'haciendagesell',
          Prefix: prefix,
        }).promise();

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          throw new Error(`No se encontraron archivos para el prefijo: ${prefix}`);
        }

        const fileKey = listResponse.Contents[0].Key;
        const data = await s3.getObject({
          Bucket: 'haciendagesell',
          Key: fileKey,
        }).promise();

        const extension = fileKey.split('.').pop() || 'pdf';

        documentosObtenidos[periodo] = {
          contentType: data.ContentType,
          data: data.Body.toString('base64'),
          filename: `${periodo}.${extension}`,
        };
      } catch (error) {
        console.error(`Error descargando archivo desde S3 para factura ${periodo}:`, error.message);

        documentosObtenidos[periodo] = {
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

exports.update = async (req, res) => {
  try {
    const { id } = req.params; // Suponiendo que proporcionas el ID del documento a actualizar en los parámetros de la solicitud.
    const camposActualizados = req.body; // Suponiendo que envías los campos actualizados en el cuerpo de la solicitud.

    // Encontrar el documento por ID y actualizarlo
    const documentoActualizado = await AbiertoAnualService.update(
      id,
      camposActualizados.tramite
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

// exports.deleteFacturasById = async function (req, res) {
//   try {
//     const { id } = req.params; // Obtén el ID de la habilitación que deseas eliminar los documentos
//     // Busca la habilitación por su ID
//     var tramite = null;
//     try{
//       tramite = await AbiertoAnual.findById(new mongoose.Types.ObjectId(id)).select("facturas").exec();
//     }catch(e){
//       console.log("Algo está mal con el ID.");
//     };
//
//     if (!tramite) {
//       return res.status(404).json({
//         message: 'La habilitación no se encontró en la base de datos.',
//       });
//     }
//
//     const facturas = tramite.facturas.toObject(); // Convierte a un objeto Mongoose
//
//     // Accede al bucket de GridFS
//     const bucket = new GridFSBucket(mongoose.connection.db, {
//       bucketName: 'facturas',
//     });
//
//     // Itera a través de los campos de documentos y elimina cada documento asociado a la habilitación específica
//     const promises = Object.keys(documentos).map(async (campo) => {
//       var documentoId = null;
//       if(facturas[campo] != null && campo != "_id"){
//         documentoId = facturas[campo];
//         // Utiliza el método delete para eliminar el documento por su ID
//         try{
//           await bucket.delete(documentoId);
//         }catch(e){
//           console.log("Error tratando de borrar el documento " + documentoId);
//         }
//       }
//       facturas[campo] = null;
//     });
//
//     // Espera a que todas las eliminaciones se completen antes de responder
//
//     await Promise.all(promises);
//
//     // Actualiza la referencia de documentos en la instancia de habilitacion
//     tramite.facturas = facturas;
//
//     // Guarda la instancia actualizada en la base de datos
//     await tramite.save();
//
//     return res.status(200).json({
//       message: 'Documentos eliminados con éxito.',
//     });
//   } catch (e) {
//     return res.status(400).json({
//       message: e.message,
//     });
//   }
// };
