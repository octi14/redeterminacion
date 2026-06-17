const PeriodoCementerio = require('../models/periodoCementerio.model');
const CertificadoDefuncion = require('../models/certificadoDefuncion.model');
const PeriodoService = require('../services/periodoCementerio.service');
const AuthService = require('../services/cementerioAuth.service');
const StorageService = require('../services/cementerioStorage.service');
const Funeraria = require('../models/funeraria.model');

const sendError = (res, error) => res.status(error.status || 400).json({ message: error.message });

exports.getAll = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    if (AuthService.canAccessAllCemetery(user)) {
      const funerarias = await Funeraria.find({ activa: true }).select('_id');
      await Promise.all(funerarias.map(item => PeriodoService.getOrCreateOpenPeriod(item._id)));
    }
    return res.status(200).json({ data: await PeriodoService.getPeriods() });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getMine = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requireAnyPermission(user, ['cementerio.read', 'cementerio.update']);
    const funerariaId = AuthService.canAccessAllCemetery(user) ? req.query.funerariaId : user.funerariaId;
    if (!funerariaId) throw Object.assign(new Error('Debe seleccionar o tener asociada una funeraria.'), { status: 400 });
    await PeriodoService.getOrCreateOpenPeriod(funerariaId);
    return res.status(200).json({ data: await PeriodoService.getPeriods({ funerariaId }) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getById = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requireAnyPermission(user, ['cementerio.read', 'cementerio.review']);
    const periodo = await PeriodoService.getPeriodWithDetails(req.params.id);
    if (!periodo) return res.status(404).json({ message: 'Período no encontrado.' });
    AuthService.ensureFunerariaAccess(user, periodo.funerariaId);
    return res.status(200).json({ data: periodo });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.confirm = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.update');
    const periodo = await PeriodoCementerio.findById(req.params.id);
    if (!periodo) return res.status(404).json({ message: 'Período no encontrado.' });
    AuthService.ensureFunerariaAccess(user, periodo.funerariaId);
    if (periodo.estado !== 'PENDIENTE_CONFIRMACION') {
      return res.status(409).json({ message: 'El período no está listo para confirmar.' });
    }

    const comprobante = req.body.comprobantePagoMensual;
    if (!comprobante || !comprobante.data) return res.status(400).json({ message: 'Debe adjuntar el comprobante mensual.' });
    const url = await StorageService.uploadBase64({
      folder: `cementerio/periodos/${periodo._id}`,
      nombre: comprobante.nombre,
      contentType: comprobante.contentType,
      data: comprobante.data,
    });
    const fallecidos = await CertificadoDefuncion.find({ periodoId: periodo._id }).lean();
    const resumen = PeriodoService.calculateSummary(fallecidos);
    periodo.comprobantePagoMensual = { nombre: comprobante.nombre, contentType: comprobante.contentType, url };
    periodo.resumenConfirmado = resumen.detalle;
    periodo.totalConfirmado = resumen.total;
    periodo.estado = 'EN_PROCESO';
    periodo.estadoRevisionPagoMensual = 'PENDIENTE';
    periodo.fechaConfirmacion = new Date();
    periodo.confirmadoPorUsuarioId = user._id;
    await periodo.save();
    return res.status(200).json({ data: await PeriodoService.getPeriodWithDetails(periodo._id) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.reviewIndividual = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    const periodo = await PeriodoCementerio.findById(req.params.periodoId);
    if (!periodo || periodo.estado !== 'EN_PROCESO') return res.status(409).json({ message: 'El período no está en proceso.' });
    const estado = req.body.estado;
    if (!['APROBADO', 'RECHAZADO'].includes(estado)) return res.status(400).json({ message: 'Estado de revisión inválido.' });
    const fallecido = await CertificadoDefuncion.findOne({ _id: req.params.fallecidoId, periodoId: periodo._id });
    if (!fallecido) return res.status(404).json({ message: 'Fallecido no encontrado en el período.' });
    fallecido.estadoRevisionPago = estado;
    fallecido.observacionRevisionPago = req.body.observacion;
    fallecido.revisadoPorUsuarioId = user._id;
    fallecido.fechaRevisionPago = new Date();
    await fallecido.save();
    return res.status(200).json({ data: fallecido });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.reviewMonthly = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    const estado = req.body.estado;
    if (!['APROBADO', 'RECHAZADO'].includes(estado)) return res.status(400).json({ message: 'Estado de revisión inválido.' });
    const periodo = await PeriodoCementerio.findOneAndUpdate(
      { _id: req.params.periodoId, estado: 'EN_PROCESO' },
      { estadoRevisionPagoMensual: estado, observacionPagoMensual: req.body.observacion },
      { new: true },
    );
    if (!periodo) return res.status(409).json({ message: 'El período no está en proceso.' });
    return res.status(200).json({ data: periodo });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.resolve = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    const periodo = await PeriodoCementerio.findById(req.params.id);
    if (!periodo || periodo.estado !== 'EN_PROCESO') return res.status(409).json({ message: 'El período no está en proceso.' });
    const estado = req.body.estado;
    if (!['APROBADO', 'RECHAZADO'].includes(estado)) return res.status(400).json({ message: 'Estado final inválido.' });
    if (estado === 'APROBADO') {
      const pendientes = await CertificadoDefuncion.countDocuments({ periodoId: periodo._id, estadoRevisionPago: { $ne: 'APROBADO' } });
      if (pendientes || periodo.estadoRevisionPagoMensual !== 'APROBADO') {
        return res.status(409).json({ message: 'Deben aprobarse todos los comprobantes antes de aprobar el período.' });
      }
    }
    periodo.estado = estado;
    periodo.fechaResolucion = new Date();
    periodo.resueltoPorUsuarioId = user._id;
    periodo.observacionResolucion = req.body.observacion;
    await periodo.save();
    return res.status(200).json({ data: await PeriodoService.getPeriodWithDetails(periodo._id) });
  } catch (error) {
    return sendError(res, error);
  }
};
