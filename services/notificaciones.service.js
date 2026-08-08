const emailTemplateService = require('./emailTemplate.service');
const correoService = require('./correo.service');
const { getCachedConfig } = require('./configs.service');

// Renderiza y envia una plantilla. Propaga errores (usado donde el llamador
// necesita saber si el envio fallo, ej. el boton "Enviar prueba" del admin).
async function enviarPlantilla(destinatario, templateKey, context = {}) {
  if (!destinatario || !templateKey) return;

  let mailerEnabled = false;
  try {
    mailerEnabled = getCachedConfig('mailerEnabled');
  } catch (_) {
    mailerEnabled = false;
  }
  if (!mailerEnabled) return;

  const rendered = await emailTemplateService.render(templateKey, context);
  await correoService.enviarCorreo(destinatario, rendered.asunto, rendered.mensaje + correoService.getFooter());
}

// Fire-and-forget: para disparar despues de responder una request. Nunca
// debe poder tirar abajo la operacion principal que la dispara.
function notificar(destinatario, templateKey, context = {}) {
  enviarPlantilla(destinatario, templateKey, context).catch((err) => {
    console.error(`No se pudo enviar el correo "${templateKey}" a ${destinatario}:`, err.message);
  });
}

module.exports = { enviarPlantilla, notificar };
