const express = require("express");
const cors = require("cors");
const jwt = require("../utils/jwt");

const UserRoute = require("../routes/user.route");
const ObraRoute = require("../routes/obra.route");
const CertificadoRoute = require("../routes/certificado.route");
const CategoriaRoute = require("../routes/categoria.route");
const MultimediaCategoriaRoute = require("../routes/multimediacategoria.route");
const IndiceRoute = require("../routes/indice.route");
const RedeterminacionRoute = require("../routes/redeterminacion.route");
const MultimediaRoute = require("../routes/multimedia.route");
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jwt());
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "OK",
  });
});

app.use("/users", UserRoute);
app.use("/obras", ObraRoute);
app.use("/certificados", CertificadoRoute);
app.use("/categorias", CategoriaRoute);
app.use("/multimediacategorias", MultimediaCategoriaRoute);
app.use("/indices", IndiceRoute);
app.use("/redeterminaciones", RedeterminacionRoute);
app.use("/multimedias", MultimediaRoute);

module.exports = app;
