const mongoose = require("mongoose");
const config = require("../config");
const TasaImportacion = require("../models/tasaImportacion.model");

function partes(fileName) {
  const limpio = String(fileName || "automotores.xlsx").split(/[\\/]/).pop();
  const extensionIndex = limpio.lastIndexOf(".");
  const extension = extensionIndex > 0 ? limpio.slice(extensionIndex) : "";
  const nombre = extensionIndex > 0 ? limpio.slice(0, extensionIndex) : limpio;
  return {
    base: nombre.replace(/--\d+$/, ""),
    extension,
  };
}

async function main() {
  await mongoose.connect(config.MONGO_URL, { autoIndex: false });
  const imports = await TasaImportacion.find()
    .select("_id tipoTasa nombreArchivo createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const usados = new Map();
  const operations = [];
  const cambios = [];

  try {
    await TasaImportacion.collection.dropIndex("tipoTasa_1_nombreArchivoClave_1");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") throw error;
  }
  await TasaImportacion.updateMany({}, { $unset: { nombreArchivoClave: 1 } });

  for (const item of imports) {
    const { base, extension } = partes(item.nombreArchivo);
    const familia = `${item.tipoTasa}|${base}${extension}`.toLocaleLowerCase();
    const siguiente = (usados.get(familia) || 0) + 1;
    usados.set(familia, siguiente);
    const nombreArchivo = siguiente === 1 ? `${base}${extension}` : `${base}--${siguiente}${extension}`;
    const nombreArchivoClave = nombreArchivo.toLocaleLowerCase();
    operations.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { nombreArchivo, nombreArchivoClave } },
      },
    });
    if (nombreArchivo !== item.nombreArchivo) {
      cambios.push({ anterior: item.nombreArchivo, nuevo: nombreArchivo });
    }
  }

  if (operations.length) await TasaImportacion.bulkWrite(operations, { ordered: true });
  await TasaImportacion.collection.createIndex(
    { tipoTasa: 1, nombreArchivoClave: 1 },
    {
      name: "tipoTasa_1_nombreArchivoClave_1",
      unique: true,
      partialFilterExpression: { nombreArchivoClave: { $type: "string" } },
    }
  );
  console.log(JSON.stringify({ total: imports.length, renombrados: cambios.length, cambios }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
