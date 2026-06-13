const mongoose = require("mongoose");
const config = require("./config.js");
const app = require("./app");
const { loadConfigs, getCachedConfig } = require("./services/configs.service");

mongoose.set("strictQuery", true);

// Se imprime solo el host para verificar la conexion sin exponer credenciales.
const mongoHost = config.MONGO_URL && config.MONGO_URL.match(/@([^/]+)/)?.[1];

async function startServer() {
  try {
    await mongoose.connect(config.MONGO_URL, {
      useNewUrlParser: true,
    });

    console.log("Successfully Established Connection with MongoDB");
    console.log("MongoDB host:", mongoHost || "(no detectado)");

    await loadConfigs();
    console.log("Configuraciones globales cargadas.");

    if (getCachedConfig("maintenanceMode")) {
      console.log("El modo de mantenimiento esta activado.");
    }

    app.listen(config.PORT, config.HOST, function () {
      console.log(`App listening on http://${config.HOST}:${config.PORT}`);
    });
  } catch (err) {
    console.error("Error al iniciar el servidor:", err.message);
    process.exit(1);
  }
}

startServer();
