const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config");
const User = require("../models/user.model");
const ExperimentalRole = require("../models/experimentalRole.model");
const ExperimentalUserRole = require("../models/experimentalUserRole.model");

const PASSWORD = "TestGesell2026!";

const users = [
  { username: "test.admin@gesell.gob.ar", roleKey: "admin" },
  { username: "test.habilitaciones@gesell.gob.ar", roleKey: "habilitaciones" },
  { username: "test.habilitaciones.jefe@gesell.gob.ar", roleKey: "habilitaciones_jefe" },
  { username: "test.turnos@gesell.gob.ar", roleKey: "turnos" },
  { username: "test.turnos.jefe@gesell.gob.ar", roleKey: "turnos_jefe" },
  { username: "test.inspeccion@gesell.gob.ar", roleKey: "inspeccion" },
  { username: "test.inspeccion.jefe@gesell.gob.ar", roleKey: "inspeccion_jefe" },
  { username: "test.pagos.dobles@gesell.gob.ar", roleKey: "pagos_dobles" },
  { username: "test.pagos.dobles.jefe@gesell.gob.ar", roleKey: "pagos_dobles_jefe" },
  { username: "test.funeraria.1@gesell.gob.ar", roleKey: "cementerio_funeraria", admin: "cementerio" },
  { username: "test.funeraria.2@gesell.gob.ar", roleKey: "cementerio_funeraria_jefe", admin: "cementerio" },
  { username: "test.compras@gesell.gob.ar", roleKey: "compras" },
  { username: "test.compras.jefe@gesell.gob.ar", roleKey: "compras_jefe" },
  { username: "test.hacienda@gesell.gob.ar", roleKey: "hacienda" },
  { username: "test.hacienda.jefe@gesell.gob.ar", roleKey: "hacienda_jefe" },
  { username: "test.modernizacion@gesell.gob.ar", roleKey: "modernizacion" },
  { username: "test.modernizacion.jefe@gesell.gob.ar", roleKey: "modernizacion_jefe" },
];

async function run() {
  if (!config.MONGO_URL) {
    throw new Error("Falta configurar MONGO_URL.");
  }

  await mongoose.connect(config.MONGO_URL, { useNewUrlParser: true });

  const roleKeys = users.map((user) => user.roleKey);
  const existingRoles = await ExperimentalRole.find({ key: { $in: roleKeys }, active: true }).lean();
  const existingRoleKeys = new Set(existingRoles.map((role) => role.key));
  const missingRoles = roleKeys.filter((key) => !existingRoleKeys.has(key));
  if (missingRoles.length) {
    throw new Error(`Faltan roles experimentales: ${missingRoles.join(", ")}`);
  }

  const password = bcrypt.hashSync(PASSWORD);

  for (const item of users) {
    const user = await User.findOneAndUpdate(
      { username: item.username },
      {
        username: item.username,
        password,
        admin: item.admin || "test",
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    await ExperimentalUserRole.findOneAndUpdate(
      { userId: user._id, roleKey: item.roleKey },
      {
        userId: user._id,
        roleKey: item.roleKey,
        active: true,
        assignedBy: {
          id: user._id,
          username: "seedExperimentalRbacUsers",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );
  }

  await mongoose.disconnect();
  console.log(`Usuarios experimentales creados/actualizados: ${users.length}`);
  console.log(`Password comun: ${PASSWORD}`);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
