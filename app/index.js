const express = require("express");
const cors = require("cors");
const jwt = require("../utils/jwt");
const { getCachedConfig } = require("../services/configs.service");


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
const FechaRoute = require('../routes/fecha.route');
const configRoutes = require('../routes/config.route');
const userActivityRoute = require('../routes/userActivity.route');
const CorreoRouter = require('../routes/correo.route');

const ordenCompraRoute = require('../routes/ordenCompra.route');
const valeCombustibleRoute = require('../routes/valeCombustible.route');
const proveedorRoute = require('../routes/proveedor.route');
const PagoDobleRoute = require("../routes/pagoDoble.route");
const VehiculoRoute = require('../routes/vehiculo.route');
const CertificadoDefuncionRoute = require('../routes/certificadoDefuncion.route');
const PeriodoCementerioRoute = require('../routes/periodoCementerio.route');
const FunerariaRoute = require('../routes/funeraria.route');
const TasaImportacionRoute = require('../routes/tasaImportacion.route');
const TasaAutomotorRoute = require('../routes/tasaAutomotor.route');
const TasaUrbanaRoute = require('../routes/tasaUrbana.route');
const TasaCatalogoRoute = require('../routes/tasaCatalogo.route');
const ExperimentalRbacRoute = require('../routes/experimentalRbac.route');



const app = express();

app.use(cors());

// Configurar express.json() con un límite de 100 MB para datos analizados
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Agregar el middleware para JWT
app.use(jwt());

// Rutas base
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "OK",
  });
});

// Middleware para verificar modo mantenimiento (opcional)
app.use((req, res, next) => {
  try {
    const maintenanceMode = getCachedConfig('maintenanceMode');
    if (req.path.startsWith('/config/general') || req.path.startsWith('/api/mailer/templates')) {
      return next();
    }
    if (maintenanceMode) {
      return res.status(503).json({ message: "El sitio está en mantenimiento. Intente más tarde." });
    }
    next();
  } catch (err) {
    next(); // Si no se encuentra la configuración, continúa normalmente
  }
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
app.use("/fecha", FechaRoute);
app.use("/api", userActivityRoute);
app.use("/api", CorreoRouter);
app.use('/config', configRoutes);
app.use("/ordenesCompra", ordenCompraRoute);
app.use("/valesCombustible", valeCombustibleRoute);
app.use("/proveedores", proveedorRoute);
app.use("/pagosDobles", PagoDobleRoute);
app.use("/vehiculos", VehiculoRoute);
app.use("/tasas/importaciones", TasaImportacionRoute);
app.use("/tasas/tipos", TasaCatalogoRoute);
app.use("/tasas/automotores", TasaAutomotorRoute);
app.use("/tasas/urbanas", TasaUrbanaRoute);
app.use("/experimental-rbac", ExperimentalRbacRoute);
app.use("/user-activities", userActivityRoute);
app.use('/cementerio/certificadosDefuncion', CertificadoDefuncionRoute);
app.use('/cementerio/periodos', PeriodoCementerioRoute);
app.use('/cementerio/funerarias', FunerariaRoute);

module.exports = app;
