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