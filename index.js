const mongoose = require("mongoose");
const config = require("./config.js");
const app = require("./app");
const dbConfiguracion = require("./models/configs.model.js");
const configService = require("./services/configs.service.js");

mongoose.set('strictQuery', true); // Agrega esta línea

mongoose.connect(
  config.MONGO_URL,
  {
    useNewUrlParser: true,
  },
  (err) => {
    if (!err) {
      console.log("Successfully Established Connection with MongoDB");
      watchConfiguracionChanges();
    } else {
      console.log(
        "Failed to Establish Connection with MongoDB with Error: " + err
      );
    }
  }
);

app.listen(config.PORT, config.HOST, function () {
  console.log(`App listening on http://${config.HOST}:${config.PORT}`);
});

function watchConfiguracionChanges() {
  const changeStream = dbConfiguracion.watch();

  changeStream.on("change", (change) => {
    console.log("Cambio detectado en la colección de configuraciones:", change);

    // Detectar el tipo de operación y actuar en consecuencia
    if (change.operationType === "update" || change.operationType === "replace") {
      const id = change.documentKey._id;

      // Opcional: Recuperar los nuevos datos de la base de datos
      dbConfiguracion.findById(id).then(async (config) => {
        if (config) {
          console.log("Nueva configuración: ", config.key);
          console.log("Descripción: ", config.description);

          // Actualizar la variable global cacheada
          await configService.updateConfig(config.key, config.value);
          
          const someValue = configService.getCachedConfig(config.key);
          console.log('Valor de configuración: ', someValue);
        }
      });
    } else if (change.operationType === "delete") {
      const id = change.documentKey._id;

      // Eliminar el dato correspondiente de la cache
      console.log(`Configuración eliminada con ID: ${id}`);
    }
  });

  changeStream.on("error", (error) => {
    console.error("Error en Change Streams:", error);
  });
}