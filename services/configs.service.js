const Config = require('../models/configs.model');

let cachedConfigs = {};
const GENERAL_CONFIG_KEYS = {
  mailerEnabled: {
    defaultValue: false,
    description: 'Habilitar o deshabilitar envio automatico de mails.',
  },
  logActivityEnabled: {
    defaultValue: true,
    description: 'Habilitar o deshabilitar logging de actividad de usuarios.',
  },
  maintenanceMode: {
    defaultValue: false,
    description: 'Modo de mantenimiento activado o desactivado.',
  },
};

// Carga todas las configuraciones en memoria
exports.loadConfigs = async () => {
  try {
    const configs = await Config.find();
    cachedConfigs = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});
    console.log('Configuraciones cargadas en caché:', cachedConfigs);
  } catch (err) {
    console.error('Error al cargar configuraciones:', err.message);
    throw err;
  }
};

// Obtener configuración de la caché
exports.getCachedConfig = (key) => {
  if (!(key in cachedConfigs)) {
    throw new Error(`Configuración con clave "${key}" no encontrada.`);
  }
  return cachedConfigs[key];
};

// Obtener configuración directamente desde la base de datos
exports.getConfigFromDB = async (key) => {
  try {
    const config = await Config.findOne({ key });
    if (!config) {
      throw new Error(`Configuración con clave "${key}" no encontrada.`);
    }
    return config.value;
  } catch (err) {
    console.error('Error al obtener configuración de la base de datos:', err.message);
    throw err;
  }
};

exports.getGeneralConfig = async () => {
  const configs = await Config.find({
    key: { $in: Object.keys(GENERAL_CONFIG_KEYS) },
  });
  const byKey = configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {});

  return Object.entries(GENERAL_CONFIG_KEYS).reduce((acc, [key, definition]) => {
    acc[key] = typeof byKey[key] === 'boolean' ? byKey[key] : definition.defaultValue;
    return acc;
  }, {});
};

exports.updateGeneralConfig = async (value = {}) => {
  const invalidKey = Object.keys(value).find((key) => !GENERAL_CONFIG_KEYS[key]);
  if (invalidKey) {
    const error = new Error(`La configuracion "${invalidKey}" no es valida.`);
    error.status = 400;
    throw error;
  }

  const updatedConfigs = [];
  for (const [key, definition] of Object.entries(GENERAL_CONFIG_KEYS)) {
    const updatedConfig = await Config.findOneAndUpdate(
      { key },
      {
        key,
        value: typeof value[key] === 'boolean' ? value[key] : definition.defaultValue,
        description: definition.description,
      },
      { new: true, upsert: true, runValidators: true }
    );
    updatedConfigs.push(updatedConfig);
  }

  await exports.loadConfigs();
  return updatedConfigs;
};

// Valor por defecto para abiertoAnualPeriodos (solo día/mes; el año se aplica al responder)
const DEFAULT_ABIERTO_ANUAL = {
  periodos: [
    { min: '01/05', max: '31/05' },
    { min: '01/08', max: '31/08' },
    { min: '01/10', max: '31/10' },
  ],
  rectificacion: { min: '01/11', max: '30/11' },
  rectificacionGlobal: undefined,
};

// Parsea "DD/MM" y devuelve Date a 00:00:00 en el año dado
function parseDDMM(str, year) {
  const [d, m] = str.split('/').map(Number);
  return new Date(year, m - 1, d);
}

function isValidDDMM(value) {
  if (!/^\d{2}\/\d{2}$/.test(String(value || ''))) return false;
  const [day, month] = String(value).split('/').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(2024, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeAbiertoAnualConfig(value = {}) {
  const periodos = Array.isArray(value.periodos) ? value.periodos : [];
  if (periodos.length !== 3) {
    const error = new Error('La configuracion de abierto anual debe tener 3 periodos.');
    error.status = 400;
    throw error;
  }

  const normalizedPeriodos = periodos.map((periodo, index) => {
    if (!isValidDDMM(periodo.min) || !isValidDDMM(periodo.max)) {
      const error = new Error(`Las fechas del periodo ${index + 1} deben tener formato DD/MM valido.`);
      error.status = 400;
      throw error;
    }
    return { min: periodo.min, max: periodo.max };
  });

  const rectificacion = value.rectificacion || DEFAULT_ABIERTO_ANUAL.rectificacion;
  if (!isValidDDMM(rectificacion.min) || !isValidDDMM(rectificacion.max)) {
    const error = new Error('Las fechas de rectificacion deben tener formato DD/MM valido.');
    error.status = 400;
    throw error;
  }

  return {
    periodos: normalizedPeriodos,
    rectificacion: { min: rectificacion.min, max: rectificacion.max },
    rectificacionGlobal: typeof value.rectificacionGlobal === 'boolean'
      ? value.rectificacionGlobal
      : undefined,
  };
}

// Devuelve la config de períodos lista para el front: minDates, maxDates (DD/MM/YYYY), rectificacion y popUpAbiertoAnualCerrado (calculados, fechas inclusivas)
exports.getAbiertoAnualPeriodosForFront = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const todayStart = new Date(year, now.getMonth(), now.getDate()).getTime();

  let raw;
  try {
    raw = await exports.getConfigFromDB('abiertoAnualPeriodos');
  } catch {
    raw = DEFAULT_ABIERTO_ANUAL;
  }

  if (!raw || !raw.periodos || !raw.rectificacion) {
    raw = DEFAULT_ABIERTO_ANUAL;
  }
  raw = normalizeAbiertoAnualConfig(raw);

  const minDates = raw.periodos.map((p) => `${p.min}/${year}`);
  const maxDates = raw.periodos.map((p) => `${p.max}/${year}`);

  const rectMin = parseDDMM(raw.rectificacion.min, year);
  const rectMax = parseDDMM(raw.rectificacion.max, year);
  const rectificacionPorFecha = todayStart >= rectMin.getTime() && todayStart <= rectMax.getTime();
  const rectificacion = typeof raw.rectificacionGlobal === 'boolean'
    ? raw.rectificacionGlobal
    : rectificacionPorFecha;

  const primerDiaPeriodo1 = parseDDMM(raw.periodos[0].min, year);
  const ultimoDiaRect = parseDDMM(raw.rectificacion.max, year);
  const popUpAbiertoAnualCerrado = todayStart < primerDiaPeriodo1.getTime() || todayStart > ultimoDiaRect.getTime();

  return {
    minDates,
    maxDates,
    rectificacion,
    rectificacionGlobal: raw.rectificacionGlobal,
    rectificacionPorFecha,
    raw,
    popUpAbiertoAnualCerrado,
  };
};

exports.updateAbiertoAnualPeriodos = async (value) => {
  const normalized = normalizeAbiertoAnualConfig(value);
  const updatedConfig = await Config.findOneAndUpdate(
    { key: 'abiertoAnualPeriodos' },
    {
      key: 'abiertoAnualPeriodos',
      value: normalized,
      description: 'Ventanas de periodos y rectificacion global de abierto anual.',
    },
    { new: true, upsert: true, runValidators: true }
  );
  await exports.loadConfigs();
  return updatedConfig;
};
