require('dotenv').config();

const mongoose = require('mongoose');
const Funeraria = require('../models/funeraria.model');
const PeriodoService = require('../services/periodoCementerio.service');

const funerarias = [
  {
    nombre: 'Funeraria Costa Gesell',
    cuit: '30700000001',
    responsable: 'Responsable de prueba 1',
    telefono: '2255000001',
    mail: 'cementerio.prueba1@gesell.gob.ar',
    activa: true,
  },
  {
    nombre: 'Servicios Fúnebres del Mar',
    cuit: '30700000002',
    responsable: 'Responsable de prueba 2',
    telefono: '2255000002',
    mail: 'cementerio.prueba2@gesell.gob.ar',
    activa: true,
  },
];

async function run() {
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL no está configurado.');
  await mongoose.connect(process.env.MONGO_URL);

  for (const data of funerarias) {
    const funeraria = await Funeraria.findOneAndUpdate(
      { cuit: data.cuit },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await PeriodoService.getOrCreateOpenPeriod(funeraria._id);
    console.log(`${funeraria.nombre}: ${funeraria._id}`);
  }

  const created = await Funeraria.find({ cuit: { $in: funerarias.map(item => item.cuit) } }).sort({ cuit: 1 }).lean();
  console.log(`Funerarias de prueba verificadas: ${created.length}`);
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
