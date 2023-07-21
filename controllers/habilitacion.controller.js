const Habilitacion = require('../models/habilitacion.model');
const HabilitacionService = require('../services/habilitacion.service');
const multer = require('multer');

// Configurar el storage para multer (opcional)
const storage = multer.memoryStorage(); // Almacenar los archivos en memoria como Buffers
const upload = multer({ storage });

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
    console.log(req.body);
    // Utilizar multer para manejar los archivos PDF adjuntos
    upload.single('archivo')(req, res, async function (err) {
      if (err instanceof multer.MulterError) {

        // Error de multer (p. ej., tamaño máximo excedido)
        console.log('Error de Multer:', err);
        return res.status(400).json({
          message: 'Error al cargar el archivo PDF.',
        });
      } else if (err) {
        // Otro tipo de error
        console.log('Error:', err);
        return res.status(500).json({
          message: 'Error interno del servidor.',
        });
      }

      // Obtener los documentos desde req.body.documentos
      const documentos = req.body.habilitacion.documentos || {};
      // Obtener otros datos de habilitación desde req.body.habilitacion
      const formData = req.body.habilitacion;

      // Creamos un objeto para almacenar los documentos
      const documentosParaGuardar = {};

      // Función para agregar un documento al objeto de documentosParaGuardar
      const agregarDocumento = (nombreCampo, archivo) => {
        if (archivo) {
          documentosParaGuardar[nombreCampo] = {
            data: Buffer.from(archivo.data, 'base64'),
            contentType: 'application/pdf',
          };
        }
      };

      // Agregar los documentos al objeto de documentosParaGuardar
      agregarDocumento('planillaAutorizacion', documentos.planillaAutorizacion);
      agregarDocumento('dniFrente', documentos.dniFrente);
      agregarDocumento('dniDorso', documentos.dniDorso);
      agregarDocumento('constanciaCuit', documentos.constanciaCuit);
      agregarDocumento('constanciaIngresosBrutos', documentos.constanciaIngresosBrutos);
      agregarDocumento('certificadoDomicilio', documentos.certificadoDomicilio);
      agregarDocumento('actaPersonaJuridica', documentos.actaPersonaJuridica);
      agregarDocumento('actaDirectorio', documentos.actaDirectorio);
      agregarDocumento('libreDeudaUrbana', documentos.libreDeudaUrbana);
      agregarDocumento('tituloPropiedad', documentos.tituloPropiedad);
      agregarDocumento('plano', documentos.plano);

      // Agregar los documentos al formData
      formData.documentos = documentosParaGuardar;

      // Crear la habilitación utilizando el servicio
      const createdHabilitacion = await HabilitacionService.create(formData);

      return res.status(201).json({
        message: 'Created',
        data: createdHabilitacion,
      });
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.update = async function (req, res) {
  try {
    const { id } = req.params;
    const formData = req.body;
    const updatedHabilitacion = await Habilitacion.findByIdAndUpdate(id, formData, { new: true });
    return res.status(200).json({
      message: 'Habilitacion modified.',
      data: updatedHabilitacion,
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
    const habilitacion = await Habilitacion.findById(id);
    return res.status(200).json({
      data: habilitacion,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByTipoSolicitud = async function (req, res) {
  try {
    const { tipoSolicitud } = req.params;
    const habilitacions = await Habilitacion.find({ 'solicitante.tipoSolicitud': tipoSolicitud });
    return res.status(200).json({
      data: habilitacions,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
