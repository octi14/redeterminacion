const Config = require('../models/configs.model');

let cachedConfigs = {};

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

// Valor por defecto para abiertoAnualPeriodos (solo día/mes; el año se aplica al responder)
const DEFAULT_ABIERTO_ANUAL = {
  periodos: [
    { min: '01/05', max: '31/05' },
    { min: '01/08', max: '31/08' },
    { min: '01/10', max: '31/10' },
  ],
  rectificacion: { min: '01/11', max: '30/11' },
};

// Parsea "DD/MM" y devuelve Date a 00:00:00 en el año dado
function parseDDMM(str, year) {
  const [d, m] = str.split('/').map(Number);
  return new Date(year, m - 1, d);
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

  const minDates = raw.periodos.map((p) => `${p.min}/${year}`);
  const maxDates = raw.periodos.map((p) => `${p.max}/${year}`);

  const rectMin = parseDDMM(raw.rectificacion.min, year);
  const rectMax = parseDDMM(raw.rectificacion.max, year);
  const rectificacion = todayStart >= rectMin.getTime() && todayStart <= rectMax.getTime();

  const primerDiaPeriodo1 = parseDDMM(raw.periodos[0].min, year);
  const ultimoDiaRect = parseDDMM(raw.rectificacion.max, year);
  const popUpAbiertoAnualCerrado = todayStart < primerDiaPeriodo1.getTime() || todayStart > ultimoDiaRect.getTime();

  return {
    minDates,
    maxDates,
    rectificacion,
    popUpAbiertoAnualCerrado,
  };
};