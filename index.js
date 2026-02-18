const mongoose = require("mongoose");
const config = require("./config.js");
const app = require("./app");

mongoose.set('strictQuery', true); // Agrega esta línea

// Para verificar en producción que se usa villa-gesell: el host se imprime al conectar (sin credenciales).
const mongoHost = config.MONGO_URL && config.MONGO_URL.match(/@([^/]+)/)?.[1];
mongoose.connect(
  config.MONGO_URL,
  {
    useNewUrlParser: true,
  },
  (err) => {
    if (!err) {
      console.log("Successfully Established Connection with MongoDB");
      console.log("MongoDB host:", mongoHost || "(no detectado)");
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
