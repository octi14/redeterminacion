require('dotenv').config();

const mongoose = require('mongoose');
const Funeraria = require('../models/funeraria.model');
const PeriodoCementerio = require('../models/periodoCementerio.model');
const CertificadoDefuncion = require('../models/certificadoDefuncion.model');

const CUITS_PRUEBA = ['30700000001', '30700000002'];

const fallecidosTemplate = [
  {
    obito: {
      apellido: 'Pérez',
      nombre: 'Juan Carlos',
      tipoDocumento: 'DNI',
      numeroDocumento: '10100001',
      fechaDefuncion: new Date('2026-05-04T12:00:00-03:00'),
    },
    tipoSepultura: 'economico',
    precioAplicado: 1000,
    condicionPago: 'PAGO',
  },
  {
    obito: {
      apellido: 'Gómez',
      nombre: 'María Elena',
      tipoDocumento: 'DNI',
      numeroDocumento: '10200002',
      fechaDefuncion: new Date('2026-05-13T12:00:00-03:00'),
    },
    tipoSepultura: 'intermedio',
    precioAplicado: 10000,
    condicionPago: 'EXENTO',
  },
  {
    obito: {
      apellido: 'Rodríguez',
      nombre: 'Carlos Alberto',
      tipoDocumento: 'DNI',
      numeroDocumento: '10300003',
      fechaDefuncion: new Date('2026-05-22T12:00:00-03:00'),
    },
    tipoSepultura: 'premium',
    precioAplicado: 100000,
    condicionPago: 'PAGO',
  },
];

function fakeDocuments(prefix) {
  return {
    documentos: [
      { nombreDocumento: 'certificadoDefuncion', url: `https://example.com/${prefix}-certificado.pdf` },
      { nombreDocumento: 'comprobantePagoTasa', url: `https://example.com/${prefix}-comprobante.pdf` },
    ],
  };
}

async function run() {
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL no está configurado.');
  await mongoose.connect(process.env.MONGO_URL);

  const funerarias = await Funeraria.find({ cuit: { $in: CUITS_PRUEBA } }).sort({ cuit: 1 });
  if (funerarias.length !== CUITS_PRUEBA.length) {
    throw new Error('No se encontraron las dos funerarias de prueba. Ejecutá primero seedFunerariasCementerio.js.');
  }

  for (const [funerariaIndex, funeraria] of funerarias.entries()) {
    const periodo = await PeriodoCementerio.findOneAndUpdate(
      { funerariaId: funeraria._id, anio: 2026, mes: 5 },
      {
        $set: {
          fechaInicio: new Date('2026-05-01T00:00:00-03:00'),
          fechaFin: new Date('2026-05-31T23:59:59.999-03:00'),
          estado: 'EN_PROCESO',
          comprobantePagoMensual: {
            nombre: `transferencia-mayo-${funeraria.cuit}.pdf`,
            contentType: 'application/pdf',
            url: `https://example.com/transferencia-mayo-${funeraria.cuit}.pdf`,
          },
          estadoRevisionPagoMensual: 'PENDIENTE',
          fechaConfirmacion: new Date('2026-06-02T10:00:00-03:00'),
          resumenConfirmado: {
            economico: { pagos: 1, exentos: 0, total: 1000 },
            intermedio: { pagos: 0, exentos: 1, total: 0 },
            premium: { pagos: 1, exentos: 0, total: 100000 },
          },
          totalConfirmado: 101000,
        },
        $setOnInsert: { funerariaId: funeraria._id, anio: 2026, mes: 5 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await CertificadoDefuncion.deleteMany({ periodoId: periodo._id, creadoPorSeed: true });

    for (const [itemIndex, template] of fallecidosTemplate.entries()) {
      const suffix = `${funerariaIndex + 1}${itemIndex + 1}`;
      await CertificadoDefuncion.create({
        funerariaId: funeraria._id,
        periodoId: periodo._id,
        funeraria: {
          cuit: funeraria.cuit,
          responsable: funeraria.responsable || 'Responsable de prueba',
          telefono: funeraria.telefono || '2255000000',
          mail: funeraria.mail || 'cementerio.prueba@gesell.gob.ar',
        },
        obito: {
          ...template.obito,
          numeroDocumento: `${template.obito.numeroDocumento.slice(0, -2)}${suffix}`,
        },
        documentos: fakeDocuments(`${funeraria.cuit}-${itemIndex + 1}`),
        tipoSepultura: template.tipoSepultura,
        precioAplicado: template.precioAplicado,
        condicionPago: template.condicionPago,
        estadoRevisionPago: 'PENDIENTE',
        estado: 'En revisión',
        creadoPorSeed: true,
      });
    }

    console.log(`${funeraria.nombre}: período mayo 2026 en EN_PROCESO con 3 fallecidos.`);
  }

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
