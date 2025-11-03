// const mongoose = require('mongoose');
// const { MONGO_URL } = require('../config');
// const OrdenCompra = require('../models/ordenCompra.model');
// const ValeCombustible = require('../models/valeCombustible.model');

// async function connect() {
//     if (!MONGO_URL) throw new Error('MONGO_URL no está definido en las variables de entorno.');
//     await mongoose.connect(MONGO_URL, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//     });
// }

// async function main() {
//     await connect();

//     console.log('Iniciando actualización de vales de combustible con sus órdenes...\n');

//     // Obtener todas las órdenes de compra para crear un mapa de ObjectId -> Orden
//     const ordenes = await OrdenCompra.find({}).lean();
//     console.log(`Órdenes de compra encontradas: ${ordenes.length}`);

//     // Crear mapa de ObjectId de orden -> Orden completa
//     const mapaOrdenId = new Map();
//     for (const orden of ordenes) {
//         mapaOrdenId.set(String(orden._id), orden);
//     }

//     // Obtener todos los vales que tienen una orden asignada
//     const vales = await ValeCombustible.find({ orden: { $exists: true, $ne: null } }).lean();
//     console.log(`Vales encontrados con orden asignada: ${vales.length}\n`);

//     let valesActualizados = 0;
//     let valesConOrdenValida = 0;
//     let valesConOrdenNoEncontrada = 0;
//     let valesSinOrden = 0;

//     for (const vale of vales) {
//         if (!vale.orden) {
//             valesSinOrden++;
//             continue;
//         }

//         const valeOrdenId = String(vale.orden);

//         // Verificar si la orden existe directamente por ObjectId
//         if (mapaOrdenId.has(valeOrdenId)) {
//             valesConOrdenValida++;
//             // La orden existe, no necesitamos actualizar nada
//             continue;
//         }

//         // La orden no existe por ObjectId
//         // Estrategia: buscar la orden que tiene este vale en su array de vales
//         const ordenConEsteVale = await OrdenCompra.findOne({
//             vales: vale._id
//         }).lean();

//         if (ordenConEsteVale) {
//             // Actualizar el vale para que apunte a la orden que tiene este vale en su array
//             await ValeCombustible.updateOne(
//                 { _id: vale._id },
//                 { $set: { orden: ordenConEsteVale._id } }
//             );
//             valesActualizados++;
//             console.log(`✓ Vale ${vale._id}: actualizado orden ${valeOrdenId} -> ${ordenConEsteVale._id} (nroOrden: ${ordenConEsteVale.nroOrden})`);
//         } else {
//             valesConOrdenNoEncontrada++;
//             console.log(`✗ Vale ${vale._id}: orden ${valeOrdenId} no encontrada y no existe ninguna orden con este vale en su array`);
//         }
//     }

//     console.log('\n=== Resumen de actualización de vales ===');
//     console.log(`Total de vales procesados: ${vales.length}`);
//     console.log(`Vales con orden válida (sin cambios): ${valesConOrdenValida}`);
//     console.log(`Vales actualizados exitosamente: ${valesActualizados}`);
//     console.log(`Vales con orden no encontrada: ${valesConOrdenNoEncontrada}`);
//     console.log(`Vales sin orden asignada: ${valesSinOrden}`);

//     await mongoose.disconnect();
// }

// if (require.main === module) {
//     main().catch(async (err) => {
//         console.error('Error en la actualización:', err);
//         try { await mongoose.disconnect(); } catch (_) {}
//         process.exitCode = 1;
//     });
// }

// module.exports = { main };

