require('dotenv').config();

const mongoose = require('mongoose');
const Funeraria = require('../models/funeraria.model');
const PeriodoCementerio = require('../models/periodoCementerio.model');
const CertificadoDefuncion = require('../models/certificadoDefuncion.model');
const PeriodoService = require('../services/periodoCementerio.service');

const CUITS_PRUEBA = ['30700000001', '30700000002'];
const PRECIOS = {
  economico: 1000,
  intermedio: 10000,
  premium: 100000,
};
const TIPOS = Object.keys(PRECIOS);
const APELLIDOS = [
  'Alvarez', 'Benitez', 'Castro', 'Diaz', 'Escobar', 'Fernandez',
  'Garcia', 'Herrera', 'Ibarra', 'Juarez', 'Lopez', 'Martinez',
  'Navarro', 'Ortiz', 'Pereyra', 'Quiroga', 'Ramirez', 'Suarez',
];
const NOMBRES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo',
  'Gabriela', 'Hector', 'Ines', 'Jorge', 'Laura', 'Martin',
  'Natalia', 'Oscar', 'Paula', 'Raul', 'Sofia', 'Tomas',
];
const ESTADOS_PERIODO = ['APROBADO', 'RECHAZADO', 'PENDIENTE_CONFIRMACION'];
const ESTADOS_REVISION = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

function monthData(offset) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  const anio = date.getFullYear();
  const mes = date.getMonth() + 1;
  return {
    anio,
    mes,
    fechaInicio: new Date(anio, mes - 1, 1),
    fechaFin: new Date(anio, mes, 0, 23, 59, 59, 999),
  };
}

function documents(prefix) {
  return {
    documentos: [
      { nombreDocumento: 'certificadoDefuncion', url: `https://example.com/qa/${prefix}-certificado.pdf` },
      { nombreDocumento: 'comprobantePagoTasa', url: `https://example.com/qa/${prefix}-comprobante.pdf` },
    ],
  };
}

function buildFallecido(funeraria, periodo, funerariaIndex, periodoIndex, itemIndex) {
  const tipoSepultura = TIPOS[(itemIndex + periodoIndex) % TIPOS.length];
  const condicionPago = itemIndex % 5 === 0 ? 'EXENTO' : 'PAGO';
  const estadoRevisionPago = ESTADOS_REVISION[(itemIndex + periodoIndex) % ESTADOS_REVISION.length];
  const sequence = `${funerariaIndex + 1}${String(periodoIndex).padStart(2, '0')}${String(itemIndex).padStart(2, '0')}`;
  const prefix = `qa-cementerio-${funeraria.cuit}-${periodo.anio}-${periodo.mes}-${itemIndex}`;

  return {
    funerariaId: funeraria._id,
    periodoId: periodo._id,
    funeraria: {
      cuit: funeraria.cuit,
      responsable: funeraria.responsable || 'Responsable QA',
      telefono: funeraria.telefono || '2255000000',
      mail: funeraria.mail || 'cementerio.qa@gesell.gob.ar',
    },
    obito: {
      apellido: `QA ${APELLIDOS[(itemIndex + periodoIndex) % APELLIDOS.length]}`,
      nombre: NOMBRES[(itemIndex * 2 + periodoIndex) % NOMBRES.length],
      tipoDocumento: 'DNI',
      numeroDocumento: `8${sequence.padEnd(7, '0').slice(0, 7)}`,
      fechaDefuncion: new Date(periodo.anio, periodo.mes - 1, Math.min(itemIndex + 1, 28), 12),
    },
    documentos: documents(prefix),
    tipoSepultura,
    precioAplicado: PRECIOS[tipoSepultura],
    condicionPago,
    estadoRevisionPago,
    estado: 'En revision',
    creadoPorSeed: true,
  };
}

async function seedPeriodo(funeraria, funerariaIndex, offset) {
  const bounds = monthData(offset);
  const estado = offset === 0
    ? 'ABIERTO'
    : offset <= 6
      ? 'EN_PROCESO'
      : ESTADOS_PERIODO[(offset + funerariaIndex) % ESTADOS_PERIODO.length];
  const estadoRevisionPagoMensual = estado === 'APROBADO'
    ? 'APROBADO'
    : ESTADOS_REVISION[(offset + funerariaIndex) % ESTADOS_REVISION.length];
  const isConfirmed = !['ABIERTO', 'PENDIENTE_CONFIRMACION'].includes(estado);

  const periodo = await PeriodoCementerio.findOneAndUpdate(
    { funerariaId: funeraria._id, anio: bounds.anio, mes: bounds.mes },
    {
      $set: {
        ...bounds,
        estado,
        estadoRevisionPagoMensual,
        comprobantePagoMensual: isConfirmed ? {
          nombre: `qa-transferencia-${funeraria.cuit}-${bounds.anio}-${bounds.mes}.pdf`,
          contentType: 'application/pdf',
          url: `https://example.com/qa/transferencia-${funeraria.cuit}-${bounds.anio}-${bounds.mes}.pdf`,
        } : undefined,
        fechaConfirmacion: isConfirmed ? new Date(bounds.fechaFin.getTime() + 86400000) : undefined,
        totalConfirmado: undefined,
        resumenConfirmado: undefined,
      },
      $setOnInsert: { funerariaId: funeraria._id },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await CertificadoDefuncion.deleteMany({ periodoId: periodo._id, creadoPorSeed: true });

  const cantidad = offset === 0 ? 18 : 12;
  const fallecidos = Array.from(
    { length: cantidad },
    (_, itemIndex) => buildFallecido(funeraria, periodo, funerariaIndex, offset, itemIndex),
  );
  await CertificadoDefuncion.insertMany(fallecidos);

  const summary = PeriodoService.calculateSummary(fallecidos);
  if (isConfirmed) {
    periodo.totalConfirmado = summary.total;
    periodo.resumenConfirmado = summary.detalle;
    await periodo.save();
  }

  return { estado, cantidad };
}

async function run() {
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL no esta configurado.');
  await mongoose.connect(process.env.MONGO_URL);

  const funerarias = await Funeraria.find({ cuit: { $in: CUITS_PRUEBA } }).sort({ cuit: 1 });
  if (funerarias.length !== CUITS_PRUEBA.length) {
    throw new Error('No se encontraron las dos funerarias de prueba. Ejecuta primero seedFunerariasCementerio.js.');
  }

  for (const [funerariaIndex, funeraria] of funerarias.entries()) {
    const results = [];
    for (let offset = 0; offset < 14; offset += 1) {
      results.push(await seedPeriodo(funeraria, funerariaIndex, offset));
    }
    const total = results.reduce((sum, item) => sum + item.cantidad, 0);
    console.log(`${funeraria.nombre}: 14 periodos y ${total} fallecidos QA verificados.`);
  }

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
