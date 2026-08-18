/**
 * Seed de muestra para la colección provisoria de tasa urbana (homologación / QA).
 * Uso: node scripts/seedTasaUrbanaDeudaQa.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../config.js");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");

const PARTIDA = "QAURB001";

async function run() {
  const uri = config.MONGO_URL || process.env.MONGO_URL;
  if (!uri) throw new Error("Falta MONGO_URL");

  await mongoose.connect(uri);
  await TasaUrbanaDeuda.deleteMany({ partida: PARTIDA });

  const barcode = "000000000000000000000000000000000000000000000";

  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const previousYear = currentMonth === 1 ? year - 1 : year

  const docs = [
    {
      partida: PARTIDA,
      contribuyente: {
        nombre: "CONTRIBUYENTE QA URBANA",
        domicilio: "AV. 3 N° 100",
        localidad: "VILLA GESELL",
        codigoPostal: "7165",
      },
      objeto: {
        partida: PARTIDA,
        catastro: "CAT-QA-1",
        parcela: "P-1",
        metrosConstruidos: 120,
        zona: "A",
      },
      anio: year,
      cuota: currentMonth,
      importeCentavos: 150000,
      vencimientos: [
        {
          orden: 1,
          fecha: new Date(year, currentMonth - 1, 15),
          importeCentavos: 150000,
          codigoBarra: barcode,
        },
        {
          orden: 2,
          fecha: new Date(year, currentMonth - 1, 28),
          importeCentavos: 165000,
          codigoBarra: barcode,
        },
      ],
      activa: true,
    },
    {
      partida: PARTIDA,
      contribuyente: {
        nombre: "CONTRIBUYENTE QA URBANA",
        domicilio: "AV. 3 N° 100",
        localidad: "VILLA GESELL",
        codigoPostal: "7165",
      },
      objeto: {
        partida: PARTIDA,
        catastro: "CAT-QA-1",
        parcela: "P-1",
        metrosConstruidos: 120,
        zona: "A",
      },
      anio: previousYear,
      cuota: previousMonth,
      importeCentavos: 140000,
      vencimientos: [
        {
          orden: 1,
          fecha: new Date(previousYear, previousMonth - 1, 15),
          importeCentavos: 140000,
          codigoBarra: barcode,
        },
        {
          orden: 2,
          fecha: new Date(previousYear, previousMonth - 1, 28),
          importeCentavos: 154000,
          codigoBarra: barcode,
        },
      ],
      activa: true,
    },
  ];

  await TasaUrbanaDeuda.insertMany(docs);
  console.log(`Seed OK: ${docs.length} boletas urbanas para partida ${PARTIDA}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
