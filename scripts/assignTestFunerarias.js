const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config");
const User = require("../models/user.model");
const Funeraria = require("../models/funeraria.model");
const ExperimentalUserRole = require("../models/experimentalUserRole.model");

const PASSWORD = "TestGesell2026!";

const assignments = [
  {
    oldUsername: "test.cementerio@gesell.gob.ar",
    username: "test.funeraria.1@gesell.gob.ar",
    roleKey: "cementerio_funeraria",
    cuit: "30700000001",
  },
  {
    oldUsername: "test.cementerio.jefe@gesell.gob.ar",
    username: "test.funeraria.2@gesell.gob.ar",
    roleKey: "cementerio_funeraria_jefe",
    cuit: "30700000002",
  },
];

async function upsertUser(item, password) {
  const funeraria = await Funeraria.findOne({ cuit: item.cuit });
  if (!funeraria) {
    throw new Error(`No existe la funeraria de prueba con CUIT ${item.cuit}. Ejecuta seedFunerariasCementerio.js primero.`);
  }

  const existingTarget = await User.findOne({ username: item.username });
  const existingOld = await User.findOne({ username: item.oldUsername });
  const user = existingTarget || existingOld || new User();

  user.username = item.username;
  user.password = password;
  user.admin = "cementerio";
  user.funerariaId = funeraria._id;
  await user.save();

  if (existingTarget && existingOld && String(existingTarget._id) !== String(existingOld._id)) {
    await ExperimentalUserRole.updateMany({ userId: existingOld._id }, { $set: { active: false } });
  }

  await User.deleteMany({
    username: item.oldUsername,
    _id: { $ne: user._id },
  });

  await ExperimentalUserRole.findOneAndUpdate(
    { userId: user._id, roleKey: item.roleKey },
    {
      userId: user._id,
      roleKey: item.roleKey,
      active: true,
      assignedBy: {
        id: user._id,
        username: "assignTestFunerarias",
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  return { username: user.username, roleKey: item.roleKey, funeraria: funeraria.nombre };
}

async function run() {
  if (!config.MONGO_URL) {
    throw new Error("Falta configurar MONGO_URL.");
  }

  await mongoose.connect(config.MONGO_URL, { useNewUrlParser: true });
  const password = bcrypt.hashSync(PASSWORD);

  const results = [];
  for (const item of assignments) {
    results.push(await upsertUser(item, password));
  }

  await mongoose.disconnect();
  console.log("Usuarios de funeraria actualizados:");
  for (const result of results) {
    console.log(`- ${result.username} -> ${result.funeraria} (${result.roleKey})`);
  }
  console.log(`Password comun: ${PASSWORD}`);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
