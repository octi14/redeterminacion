const CertificadoDefuncion = require('../models/certificadoDefuncion.model');
const Service = require('../services/certificadoDefuncion.service');
const PeriodoCementerio = require('../models/periodoCementerio.model');
const PeriodoService = require('../services/periodoCementerio.service');
const AuthService = require('../services/cementerioAuth.service');
const StorageService = require('../services/cementerioStorage.service');


exports.getAll = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requireAnyPermission(user, ['cementerio.read', 'cementerio.review']);
    const filter = AuthService.canAccessAllCemetery(user) ? {} : { funerariaId: user.funerariaId };
    const items = await Service.findAll(filter);
    return res.status(200).json({ data: items });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

// Crea un certificado, sube documentos a S3 y guarda URLs
exports.add = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.update');
    const documentos = req.body && req.body.certificado && req.body.certificado.documentos || {};
    const formData = req.body && req.body.certificado || {};
    const funerariaId = AuthService.resolveFunerariaId(user, formData.funerariaId);
    const periodo = await PeriodoService.getOrCreateOpenPeriod(funerariaId);
    if (periodo.estado !== 'ABIERTO') return res.status(409).json({ message: 'No hay un período abierto para la funeraria.' });

    formData.funerariaId = funerariaId;
    formData.periodoId = periodo._id;
    formData.creadoPorUsuarioId = user._id;
    formData.modificadoPorUsuarioId = user._id;
    formData.estadoRevisionPago = 'PENDIENTE';
    formData.documentos = { documentos: [] };

    for (const nombreDocumento of Object.keys(documentos)) {
      const documento = documentos[nombreDocumento];
      if (!documento || !documento.contenido) continue;
      const url = await StorageService.uploadBase64({
        folder: `cementerio/fallecidos/${periodo._id}`,
        nombre: documento.nombreDocumento || nombreDocumento,
        contentType: documento.contenido.contentType,
        data: documento.contenido.data,
      });
      formData.documentos.documentos.push({ nombreDocumento, url });
    }

    const created = await Service.create(formData);
    return res.status(201).json({ message: 'éxito.', data: created._id });
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.update');
    const { id } = req.params;
    const payload = req.body && (req.body.certificado || req.body);
    const current = await CertificadoDefuncion.findById(id);
    if (!current) return res.status(404).json({ error: 'Documento no encontrado' });
    AuthService.ensureFunerariaAccess(user, current.funerariaId);
    const periodo = await PeriodoCementerio.findById(current.periodoId);
    if (!periodo || periodo.estado !== 'ABIERTO') {
      return res.status(409).json({ message: 'El período está cerrado y no admite modificaciones.' });
    }
    delete payload.funerariaId;
    delete payload.periodoId;
    delete payload.estadoRevisionPago;
    delete payload.documentos;
    payload.modificadoPorUsuarioId = user._id;
    const updated = await Service.update(id, payload);
    if (!updated) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.status(200).json(updated);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.updateLazy = async (req, res) => {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, '*');
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
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.update');
    const { id } = req.params;
    const item = await CertificadoDefuncion.findById(id);
    if (!item) return res.status(404).json({ message: 'Registro no encontrado.' });
    AuthService.ensureFunerariaAccess(user, item.funerariaId);
    const periodo = await PeriodoCementerio.findById(item.periodoId);
    if (!periodo || periodo.estado !== 'ABIERTO') return res.status(409).json({ message: 'El período está cerrado.' });
    await CertificadoDefuncion.findByIdAndDelete(id);
    return res.status(200).json({ message: 'CertificadoDefuncion eliminado.' });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.getById = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requireAnyPermission(user, ['cementerio.read', 'cementerio.review']);
    const { id } = req.params;
    const item = await CertificadoDefuncion.findById(id).select('-documentos');
    if (!item) return res.status(404).json({ message: 'Registro no encontrado.' });
    AuthService.ensureFunerariaAccess(user, item.funerariaId);
    return res.status(200).json({ data: item });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.getDocumentosById = async (req, res) => {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requireAnyPermission(user, ['cementerio.read', 'cementerio.review']);
    const { id } = req.params;
    const item = await CertificadoDefuncion.findById(id).select('documentos funerariaId');
    if (!item) return res.status(404).json({ message: 'no encontrada.' });
    AuthService.ensureFunerariaAccess(user, item.funerariaId);
    const documentosArray = (item.documentos && item.documentos.documentos) || [];
    const documentos = {};
    documentosArray.forEach(doc => {
      documentos[doc.nombreDocumento] = { url: StorageService.getSignedUrl(doc.url) };
    });
    return res.status(200).json({ data: documentos });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};


