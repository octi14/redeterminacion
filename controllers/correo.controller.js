const correoService = require('../services/correo.service');
const { getCachedConfig } = require('../services/configs.service');

exports.enviarCorreo = async (req, res) => {
  try {
    const isFeatureEnabled = getCachedConfig('mailerEnabled');
        if (!isFeatureEnabled) {
            return res.status(203).json({ message: 'Funcionalidad deshabilitada.' });
        }
    const { destinatario, asunto, mensaje } = req.body;
    const resultado = await correoService.enviarCorreo(destinatario, asunto, mensaje);
    return res.status(200).json({ message: 'Correo enviado con éxito', data: resultado });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al enviar el correo', error: error.message });
  }
};
