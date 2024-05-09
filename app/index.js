const express = require("express");
const cors = require("cors");
const jwt = require("../utils/jwt");

const UserRoute = require("../routes/user.route");
const ObraRoute = require("../routes/obra.route");
const CertificadoRoute = require("../routes/certificado.route");
const CategoriaRoute = require("../routes/categoria.route");
const IndiceRoute = require("../routes/indice.route");
const RedeterminacionRoute = require("../routes/redeterminacion.route");
const MultimediaRoute = require("../routes/multimedia.route");
const HabilitacionRoute = require("../routes/habilitacion.route");
const TurnoRoute = require('../routes/turno.route');
const AbiertoAnualRoute = require ('../routes/abiertoAnual.route');
const MaestroComercioRoute = require('../routes/maestroComercio.route');
const app = express();

app.use(cors());

// Configurar express.json() con un límite de 100 MB para datos analizados
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Agregar el middleware para JWT
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
app.use("/indices", IndiceRoute);
app.use("/redeterminaciones", RedeterminacionRoute);
app.use("/multimedias", MultimediaRoute);
app.use("/habilitaciones", HabilitacionRoute);
app.use("/turnos", TurnoRoute);
app.use("/abiertoAnual", AbiertoAnualRoute);
app.use("/maestro", MaestroComercioRoute);

module.exports = app;
