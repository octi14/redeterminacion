const correoService = require('../services/correo.service');
const emailTemplateService = require('../services/emailTemplate.service');
const { getCachedConfig } = require('../services/configs.service');

exports.enviarCorreo = async (req, res) => {
  try {
    const isFeatureEnabled = getCachedConfig('mailerEnabled');
    if (!isFeatureEnabled) {
      return res.status(203).json({ message: 'Funcionalidad deshabilitada.' });
    }

    const { destinatario, templateKey, context } = req.body;
    let { asunto, mensaje } = req.body;

    if (templateKey) {
      const rendered = await emailTemplateService.render(templateKey, context || {});
      asunto = rendered.asunto;
      mensaje = rendered.mensaje + correoService.getFooter();
    }

    const resultado = await correoService.enviarCorreo(destinatario, asunto, mensaje);
    return res.status(200).json({ message: 'Correo enviado con exito', data: resultado });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: 'Error al enviar el correo', error: error.message });
  }
};

exports.listarPlantillas = async (_req, res) => {
  try {
    const templates = await emailTemplateService.getTemplates();
    return res.status(200).json(templates);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.actualizarPlantilla = async (req, res) => {
  try {
    const template = await emailTemplateService.updateTemplate(req.params.key, req.body);
    return res.status(200).json({ message: 'Plantilla actualizada.', data: template });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.previsualizarPlantilla = async (req, res) => {
  try {
    const rendered = await emailTemplateService.render(req.params.key, req.body || {});
    return res.status(200).json(rendered);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};
