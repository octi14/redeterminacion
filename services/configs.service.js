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

exports.updateConfig = async (key, value, persist = false) => {
  try {
    // Actualiza la caché local
    cachedConfigs[key] = value;

    console.log(`Configuración actualizada en caché: ${key} = ${value}`);

    if (persist) {
      // También persiste el cambio en la base de datos
      await Config.updateOne({ key }, { value }, { upsert: true });
      console.log(`Configuración persistida en la base de datos: ${key} = ${value}`);
    }
  } catch (err) {
    console.error('Error al actualizar configuración:', err.message);
    throw err;
  }
};