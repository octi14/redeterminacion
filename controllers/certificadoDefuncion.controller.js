const CertificadoDefuncion = require('../models/certificadoDefuncion.model');
const Service = require('../services/certificadoDefuncion.service');
const multer = require('multer');
const AWS = require('aws-sdk');

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3storage = multer.memoryStorage();

exports.getAll = async function (_req, res) {
  try {
    const items = await Service.findAll();
    return res.status(200).json({ data: items });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

// Crea un certificado, sube documentos a S3 y guarda URLs
exports.add = async function (req, res) {
  try {
    const upload = multer({
      s3storage,
      limits: { fileSize: 48 * 1024 * 1024 },
    });

    upload.array('archivo', 10)(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        if (!res.headersSent) return res.status(400).json({ message: 'Error al cargar el archivo.' });
      } else if (err) {
        if (!res.headersSent) return res.status(500).json({ message: 'Error interno del servidor.' });
      }

      const documentos = (req.body && req.body.certificado && req.body.certificado.documentos) || {};
      const formData = (req.body && req.body.certificado) || {};
      formData.documentos = { documentos: [] };

      const uploadOne = async (nombreDocumento, documento) => {
        if (documento && documento.contenido) {
          const contentType = documento.contenido.contentType || 'application/octet-stream';
          const extension = (contentType.split('/')[1] || 'bin');
          const nombreArchivo = `${nombreDocumento}_${Date.now()}.${extension}`;
          const buffer = Buffer.from(documento.contenido.data, 'base64');
          const params = {
            Bucket: process.env.AWS_BUCKET || 'haciendagesell',
            Key: `cementerio/${nombreArchivo}`,
            Body: buffer,
            ContentType: contentType,
          };
          const data = await s3.upload(params).promise();
          formData.documentos.documentos.push({ nombreDocumento, url: data.Location });
        }
      };

      const promises = [];
      for (const nombreDocumento in documentos) {
        if (Object.prototype.hasOwnProperty.call(documentos, nombreDocumento)) {
          const documento = documentos[nombreDocumento];
          promises.push(uploadOne(documento.nombreDocumento, documento));
        }
      }
      await Promise.all(promises);

      const created = await Service.create(formData);
      if (!res.headersSent) return res.status(201).json({ message: 'éxito.', data: created._id });
    });
  } catch (e) {
    if (!res.headersSent) return res.status(400).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body && (req.body.certificado || req.body);
    const updated = await Service.update(id, payload);
    if (!updated) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.status(200).json(updated);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.updateLazy = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body && (req.body.certificado || req.body);
    const updated = await Service.updateLazy(id, payload);
    if (!updated) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.status(200).json(updated);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.delete = async function (req, res) {
  try {
    const { id } = req.params;
    await CertificadoDefuncion.findByIdAndDelete(id);
    return res.status(200).json({ message: 'CertificadoDefuncion eliminado.' });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.getById = async function (req, res) {
  try {
    const { id } = req.params;
    const item = await CertificadoDefuncion.findById(id).select('-documentos');
    return res.status(200).json({ data: item });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.getDocumentosById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await CertificadoDefuncion.findById(id).select('documentos');
    if (!item) return res.status(404).json({ message: 'no encontrada.' });
    const documentosArray = (item.documentos && item.documentos.documentos) || [];
    const documentos = {};
    documentosArray.forEach(doc => {
      documentos[doc.nombreDocumento] = { url: doc.url };
    });
    return res.status(200).json({ data: documentos });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};


