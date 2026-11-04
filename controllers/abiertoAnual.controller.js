const AbiertoAnual = require('../models/abiertoAnual.model');
const AbiertoAnualService = require('../services/abiertoAnual.service');
const {
  parsePeriodo,
  assertPeriodArrays,
  isValidFacturaUrl,
  keyFromUrl,
} = require('../services/abiertoAnualValidation');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // definilo en tu .env
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // definilo en tu .env
  region: process.env.AWS_REGION, // o la que estés usando
});

// Método para añadir documento a AbiertoAnual y guardarlo en S3
exports.addDocument = async function (req, res) {
  try {
    const { id } = req.params;
    const periodo = parsePeriodo(req.body.periodo);
    const documento = req.body.factura;

    if (periodo == null) {
      return res.status(400).json({ message: 'Período inválido. Debe ser 0, 1 o 2.' });
    }

    if (!documento || !documento.contenido || !documento.contenido.data || !documento.contenido.contentType) {
      return res.status(400).json({ message: 'Faltan datos del documento' });
    }

    // Buscar el registro
    const abiertoAnual = await AbiertoAnual.findById(id);
    if (!abiertoAnual) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    assertPeriodArrays(abiertoAnual);

    // Si ya hay un documento cargado en esa posición, lo eliminamos de S3
    if (abiertoAnual.facturas[periodo] && abiertoAnual.facturas[periodo].url) {
      const prevKey = keyFromUrl(abiertoAnual.facturas[periodo].url);
      if (prevKey) {
        try {
          await s3.deleteObject({
            Bucket: 'haciendagesell',
            Key: prevKey,
          }).promise();
        } catch (err) {
          console.log('No se pudo eliminar archivo anterior de S3:', err.message);
        }
      }
    }

    // Armar el nuevo archivo
    const cuit = abiertoAnual.cuit ? abiertoAnual.cuit : '';
    const nroLegajo = abiertoAnual.nroLegajo;
    const contentType = documento.contenido.contentType;
    const extension = (contentType.split('/')[1] || 'pdf').split(';')[0];
    const nombreArchivo = `abierto-anual/${cuit}_${nroLegajo}_${periodo}.${extension}`;
    const buffer = Buffer.from(documento.contenido.data, 'base64');

    const paramsUpload = {
      Bucket: 'haciendagesell',
      Key: nombreArchivo,
      Body: buffer,
      ContentType: contentType,
    };

    const uploadResult = await s3.upload(paramsUpload).promise();

    if (!isValidFacturaUrl(uploadResult.Location, cuit, nroLegajo, periodo)) {
      return res.status(500).json({
        message: 'La URL generada no coincide con el período. No se guardó el registro.',
      });
    }

    const prevObs = abiertoAnual.facturas[periodo]?.observaciones || '';
    abiertoAnual.facturas.set(periodo, {
      url: uploadResult.Location,
      observaciones: prevObs,
      rectificando: false,
    });
    abiertoAnual.set(`fechasCarga.${periodo}`, new Date());
    abiertoAnual.set(`status.${periodo}`, 'En revisión');
    abiertoAnual.markModified('facturas');
    abiertoAnual.markModified('fechasCarga');
    abiertoAnual.markModified('status');

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

    const facturasArr = Array.isArray(tramite.facturas) ? tramite.facturas : [];
    const statusArr = Array.isArray(datosTramite.status) ? datosTramite.status : [];
    const documentosObtenidos = {};
    const region = process.env.AWS_REGION || 'us-east-2';
    const bucketHost = `https://haciendagesell.s3.${region}.amazonaws.com/`;

    const keyFromUrl = (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
      } catch {
        return null;
      }
    };

    const periodFromKey = (key) => {
      const m = String(key || '').match(/_(\d+)\.[^./]+$/);
      return m ? Number(m[1]) : null;
    };

    for (let periodo = 0; periodo < Math.max(facturasArr.length, statusArr.length, 3); periodo++) {
      const factura = facturasArr[periodo];
      const status = statusArr[periodo];
      const expectsFile = !!(factura && factura.url) || (status && status !== 'Incompleto');
      if (!expectsFile) continue;

      try {
        const prefix = `abierto-anual/${datosTramite.cuit}_${datosTramite.nroLegajo}_${periodo}`;
        let fileKey = null;

        const listResponse = await s3.listObjectsV2({
          Bucket: 'haciendagesell',
          Prefix: prefix,
          MaxKeys: 5,
        }).promise();

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          fileKey = listResponse.Contents[0].Key;
        } else if (factura?.url) {
          const fromUrl = keyFromUrl(factura.url);
          if (fromUrl && periodFromKey(fromUrl) === periodo) {
            fileKey = fromUrl;
          }
        }

        if (!fileKey) {
          throw new Error(`No se encontraron archivos para el prefijo: ${prefix}`);
        }

        const data = await s3.getObject({
          Bucket: 'haciendagesell',
          Key: fileKey,
        }).promise();

        const extension = fileKey.split('.').pop() || 'pdf';

        documentosObtenidos[periodo] = {
          contentType: data.ContentType,
          data: data.Body.toString('base64'),
          filename: `${periodo}.${extension}`,
          url: `${bucketHost}${fileKey}`,
        };
      } catch (error) {
        console.error(`Error descargando archivo desde S3 para factura ${periodo}:`, error.message);

        documentosObtenidos[periodo] = {
          error: 'Archivo no encontrado.',
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
      message: error.message,
    });
  }
};
