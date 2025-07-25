const mongoose = require('mongoose');
const Config = require('../models/configs.model');

(async () => {
  try {
    //const mongoUrl = process.env.MONGO_URL; // Accede a la variable de entorno
    const mongoUrl = "mongodb+srv://octi14:octavio14@tiendacluster.1zpsi.mongodb.net/munivgtest"; // Accede a la variable de entorno
    if (!mongoUrl) {
        console.log("La variable MONGO_URL no está configurada en el archivo .env");
    }

    await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('Conectado a la base de datos.');

    // Inserta configuraciones iniciales
    const configs = [
      { key: 'logActivityEnabled', value: true, description: 'Habilitar o deshabilitar logging de actividad de usuarios.' },
      { key: 'mailerEnabled', value: false, description: 'Habilitar o deshabilitar envío automático de mails.' },
      { key: 'maintenanceMode', value: false, description: 'Modo de mantenimiento activado o desactivado' },   
    ];

    for (const config of configs) {
      await Config.updateOne({ key: config.key }, config, { upsert: true }); // Actualiza o inserta
    }

    console.log('Configuraciones iniciales guardadas.');
    process.exit(0);
  } catch (err) {
    console.error('Error al inicializar configuraciones:', err.message);
    process.exit(1);
  }
})();