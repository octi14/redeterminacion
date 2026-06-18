const Config = require('../models/configs.model');

const TEMPLATE_CONFIG_KEY = 'emailTemplates';

const DEFAULT_TEMPLATES = [
  {
    key: 'comercio.solicitud_recibida',
    module: 'Comercio',
    name: 'Solicitud comercial recibida',
    description: 'Se envia cuando un contribuyente inicia un tramite comercial.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro'],
    subject: 'Solicitud de tramite comercial recibida - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su solicitud de tramite comercial ha sido registrada correctamente.
En los proximos dias recibira un correo electronico del Departamento Comercio Municipal en el que le indicaran como continuar.
Asegurese de revisar la bandeja de correos no deseados (Spam).
Tenga en cuenta que el tramite finalizara con la presentacion de la documentacion original en la oficina de comercio dentro de los 10 dias habiles posteriores a recibir el mail de confirmacion.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio Municipal (deptocomercio@gesell.gob.ar).`,
  },
  {
    key: 'turnos.inspeccion_confirmada',
    module: 'Comercio',
    name: 'Turno de inspeccion confirmado',
    description: 'Se envia cuando un contribuyente reserva un turno de inspeccion comercial.',
    variables: ['nroTramite', 'fechaInspeccion', 'horario', 'domicilio', 'nombre'],
    subject: 'Turno de inspeccion confirmado - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su turno de inspeccion comercial ha sido confirmado exitosamente.

Numero de tramite: {{nroTramite}}
Fecha de inspeccion: {{fechaInspeccion}}
Horario: {{horario}}
Domicilio: {{domicilio}}
Nombre: {{nombre}}

Importante:
- Asegurese de estar presente en el domicilio indicado en el horario seleccionado.
- Tenga disponible la documentacion correspondiente.
- Solo puede cancelar el turno hasta 5 dias antes de la inspeccion.`,
  },
  {
    key: 'comercio.documentacion_requerida',
    module: 'Comercio',
    name: 'Documentacion requerida',
    description: 'Se envia cuando una solicitud comercial requiere documentacion original.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro'],
    subject: 'Documentacion requerida - Tramite Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su tramite comercial requiere que presente los originales de los documentos que envio online.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Por favor, presente los documentos originales en el Departamento Comercio MVGesell para continuar con el tramite.
Adicionalmente, puede presentar su documentacion en la Casa de Villa Gesell en Buenos Aires, ubicada en Avenida Corrientes 1312, piso 11 oficina 42, CABA.
Debera presentar los documentos originales dentro de los proximos 10 dias habiles.
En caso contrario, el tramite caera y debera iniciarlo nuevamente.

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (deptocomercio@gesell.gob.ar).`,
  },
  {
    key: 'comercio.tramite_finalizado',
    module: 'Comercio',
    name: 'Tramite comercial finalizado',
    description: 'Se envia cuando se finaliza una habilitacion comercial.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro', 'nroExpediente', 'alcance'],
    subject: 'Tramite comercial finalizado - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su tramite comercial ha sido finalizado exitosamente.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}
Numero de expediente: {{nroExpediente}}
{{alcance}}

El tramite ha sido culminado exitosamente. Recuerde que en el plazo de 10 dias habiles debera acreditar los originales de la documentacion en el Departamento Comercio sito en Avda 3 Nro 820 Planta Baja - Villa Gesell.`,
  },
  {
    key: 'comercio.solicitud_aprobada_inspeccion',
    module: 'Comercio',
    name: 'Solicitud aprobada con inspeccion',
    description: 'Se envia cuando una solicitud comercial aprobada requiere turno de inspeccion.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro'],
    subject: 'Solicitud de tramite comercial aprobada - Requiere inspeccion - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su solicitud de tramite comercial ha sido aprobada exitosamente. Ha finalizado la etapa de revision y la documentacion presentada es correcta.

Importante: Su comercio requiere inspeccion para continuar con el tramite.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Para continuar con el tramite, debe solicitar un turno para inspeccion comercial en la pagina de turnos web.
Puede acceder a la pagina de turnos en: https://haciendavgesell.gob.ar/comercio/turnos .`,
  },
  {
    key: 'comercio.solicitud_aprobada',
    module: 'Comercio',
    name: 'Solicitud comercial aprobada',
    description: 'Se envia cuando una solicitud comercial es aprobada sin inspeccion.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro'],
    subject: 'Solicitud de tramite comercial aprobada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su solicitud de tramite comercial ha sido aprobada exitosamente.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Para completar el tramite, en el plazo de 10 dias habiles debe concurrir al Departamento Comercio MVGesell con los originales de los documentos presentados online, proceder al pago de la Tasa de Habilitacion pertinente y constituir el Domicilio Fiscal Electronico (DFE) solicitando datos a dirarvige@gesell.gob.ar.

Adicionalmente, puede presentar su documentacion en la Casa de Villa Gesell en Buenos Aires, ubicada en Avenida Corrientes 1312, piso 11 oficina 42, CABA.`,
  },
  {
    key: 'comercio.baja_aprobada',
    module: 'Comercio',
    name: 'Baja aprobada',
    description: 'Se envia cuando se aprueba una baja comercial.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro'],
    subject: 'Solicitud de baja aprobada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su solicitud de baja ha sido aprobada exitosamente.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Para completar el tramite, debe abonar las deudas de tasas correspondientes en el Departamento Comercio MVGesell. Una vez realizado el pago, se le notificara la finalizacion del tramite.

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (habilitacioncomercial@gesell.gob.ar).`,
  },
  {
    key: 'comercio.renovacion_finalizada',
    module: 'Comercio',
    name: 'Renovacion o reempadronamiento finalizado',
    description: 'Se envia cuando finaliza una renovacion o reempadronamiento.',
    variables: ['nroTramite', 'tipoSolicitud', 'tipoTramite', 'rubro', 'nroExpediente', 'alcance'],
    subject: '{{tipoTramite}} finalizada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su tramite de {{tipoTramite}} ha sido finalizado exitosamente.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}
Numero de expediente: {{nroExpediente}}
Alcance: {{alcance}}

El tramite esta completo. En los proximos dias recibira la documentacion correspondiente.

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (renovacioncomercial@gesell.gob.ar).`,
  },
  {
    key: 'comercio.solicitud_rechazada',
    module: 'Comercio',
    name: 'Solicitud comercial rechazada',
    description: 'Se envia cuando una solicitud comercial es rechazada.',
    variables: ['nroTramite', 'tipoSolicitud', 'rubro', 'elementosIncorrectos'],
    subject: 'Solicitud de tramite comercial rechazada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su solicitud de tramite comercial ha sido rechazada.

Numero de tramite: {{nroTramite}}
Tipo de solicitud: {{tipoSolicitud}}
Rubro: {{rubro}}

Se han detectado elementos incorrectos en la documentacion presentada, los cuales se detallan a continuacion:
{{elementosIncorrectos}}

Debera volver a presentar la solicitud una vez subsanados los errores detectados.

Importante: La documentacion que adjunte debe ser legible y en formato PDF o imagen.`,
  },
  {
    key: 'turnos.inspeccion_aprobada',
    module: 'Comercio',
    name: 'Inspeccion aprobada',
    description: 'Se envia cuando una inspeccion comercial es aprobada.',
    variables: ['nroTramite', 'fechaInspeccion', 'horario', 'domicilio'],
    subject: 'Inspeccion comercial aprobada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su inspeccion comercial ha sido aprobada exitosamente.

Numero de tramite: {{nroTramite}}
Fecha de inspeccion: {{fechaInspeccion}}
Horario: {{horario}}
Domicilio: {{domicilio}}

El tramite continuara desde el Departamento Comercio MVGesell. En los proximos dias recibira un correo electronico indicandole los pasos a seguir para finalizar el tramite, incluyendo el pago de la/s tasa/s correspondiente/s.`,
  },
  {
    key: 'turnos.prorroga_otorgada',
    module: 'Comercio',
    name: 'Prorroga otorgada',
    description: 'Se envia cuando se otorga una prorroga a una inspeccion comercial.',
    variables: ['nroTramite', 'fechaInspeccion', 'horario', 'domicilio'],
    subject: 'Prorroga otorgada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Se le ha otorgado una prorroga para su inspeccion comercial.

Numero de tramite: {{nroTramite}}
Fecha de inspeccion: {{fechaInspeccion}}
Horario: {{horario}}
Domicilio: {{domicilio}}

La prorroga es de 7 dias a partir de la fecha de otorgacion. Para continuar con el tramite, debe completar los requisitos pendientes antes del vencimiento de la misma.

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (deptocomercio@gesell.gob.ar).`,
  },
  {
    key: 'turnos.inspeccion_rechazada',
    module: 'Comercio',
    name: 'Inspeccion rechazada',
    description: 'Se envia cuando una inspeccion comercial es rechazada.',
    variables: ['nroTramite', 'fechaInspeccion', 'horario', 'domicilio', 'motivo'],
    subject: 'Inspeccion comercial rechazada - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su inspeccion comercial ha sido rechazada.

Numero de tramite: {{nroTramite}}
Fecha de inspeccion: {{fechaInspeccion}}
Horario: {{horario}}
Domicilio: {{domicilio}}

Motivo del rechazo: {{motivo}}

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (deptocomercio@gesell.gob.ar).`,
  },
  {
    key: 'turnos.cancelado',
    module: 'Comercio',
    name: 'Turno de inspeccion cancelado',
    description: 'Se envia cuando se cancela un turno de inspeccion comercial.',
    variables: ['nroTramite', 'fechaInspeccion', 'horario', 'domicilio', 'motivo'],
    subject: 'Turno de inspeccion cancelado - Nro {{nroTramite}}',
    body: `Estimado/a contribuyente,

Su turno de inspeccion comercial ha sido cancelado.

Numero de tramite: {{nroTramite}}
Fecha de inspeccion: {{fechaInspeccion}}
Horario: {{horario}}
Domicilio: {{domicilio}}

Motivo de la cancelacion: {{motivo}}

Para continuar con el tramite, debe solicitar un nuevo turno de inspeccion en la pagina de turnos web.

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Comercio MVGesell (deptocomercio@gesell.gob.ar).`,
  },
  {
    key: 'pagosDobles.solicitud_recibida',
    module: 'Recaudaciones',
    name: 'Pago doble recibido',
    description: 'Se envia cuando se registra un reclamo por pago doble.',
    variables: ['nroTramite'],
    subject: 'Solicitud de pago doble recibida',
    body: `Estimado/a contribuyente,

Su reclamo por pago doble ha sido registrado correctamente.
En los proximos dias recibira un correo electronico del Departamento Recaudaciones Municipal en el que le indicaran como continuar.
Asegurese de revisar la bandeja de correos no deseados (Spam).

Numero de tramite: R{{nroTramite}}`,
  },
  {
    key: 'pagosDobles.aprobada',
    module: 'Recaudaciones',
    name: 'Pago doble aprobado',
    description: 'Se envia cuando se aprueba un reclamo por pago doble.',
    variables: ['nroTramite', 'fechaAprobacion', 'comentario'],
    subject: 'Aprobacion de reclamo de pago doble Nro R{{nroTramite}}',
    body: `Estimado/a contribuyente,

Su reclamo de pago doble ha sido aprobado exitosamente.
Su documentacion sera procesada y recibira las instrucciones correspondientes en los proximos dias.

Numero de tramite: R{{nroTramite}}
Fecha de aprobacion: {{fechaAprobacion}}
{{comentario}}
Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Recaudaciones Municipal (recaudaciones@gesell.gob.ar).`,
  },
  {
    key: 'pagosDobles.rechazada',
    module: 'Recaudaciones',
    name: 'Pago doble rechazado',
    description: 'Se envia cuando se rechaza un reclamo por pago doble.',
    variables: ['nroTramite', 'motivo'],
    subject: 'Rechazo de solicitud de pago doble Nro R{{nroTramite}}',
    body: `Estimado/a contribuyente,

Su reclamo de pago doble ha sido rechazado por el siguiente motivo:
{{motivo}}

Si tiene dudas o necesita mas informacion, por favor comuniquese con el Departamento Recaudaciones Municipal (recaudaciones@gesell.gob.ar).`,
  },
];

function mergeTemplate(defaultTemplate, storedTemplate) {
  return {
    ...defaultTemplate,
    ...(storedTemplate || {}),
    key: defaultTemplate.key,
    module: defaultTemplate.module,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    variables: defaultTemplate.variables,
  };
}

async function getStoredTemplates() {
  const config = await Config.findOne({ key: TEMPLATE_CONFIG_KEY });
  return Array.isArray(config?.value) ? config.value : [];
}

exports.getTemplates = async () => {
  const storedTemplates = await getStoredTemplates();
  return DEFAULT_TEMPLATES.map((template) => (
    mergeTemplate(template, storedTemplates.find((stored) => stored.key === template.key))
  ));
};

exports.updateTemplate = async (key, payload = {}) => {
  const defaultTemplate = DEFAULT_TEMPLATES.find((template) => template.key === key);
  if (!defaultTemplate) {
    const error = new Error('La plantilla indicada no existe.');
    error.status = 404;
    throw error;
  }
  if (!payload.subject || !payload.body) {
    const error = new Error('La plantilla debe tener asunto y cuerpo.');
    error.status = 400;
    throw error;
  }

  const templates = await exports.getTemplates();
  const nextTemplates = templates.map((template) => (
    template.key === key
      ? mergeTemplate(defaultTemplate, {
        subject: String(payload.subject),
        body: String(payload.body),
        enabled: payload.enabled !== false,
      })
      : template
  ));

  await Config.findOneAndUpdate(
    { key: TEMPLATE_CONFIG_KEY },
    {
      key: TEMPLATE_CONFIG_KEY,
      value: nextTemplates,
      description: 'Plantillas editables de correos automaticos.',
    },
    { new: true, upsert: true, runValidators: true }
  );

  return nextTemplates.find((template) => template.key === key);
};

exports.render = async (key, context = {}) => {
  const templates = await exports.getTemplates();
  const template = templates.find((item) => item.key === key);
  if (!template) {
    const error = new Error('La plantilla indicada no existe.');
    error.status = 404;
    throw error;
  }
  if (template.enabled === false) {
    const error = new Error('La plantilla indicada esta deshabilitada.');
    error.status = 400;
    throw error;
  }

  const renderText = (text) => String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, variable) => {
    const value = String(variable).split('.').reduce((acc, part) => acc?.[part], context);
    return value === undefined || value === null ? '' : String(value);
  });

  return {
    asunto: renderText(template.subject),
    mensaje: renderText(template.body),
    template,
  };
};
