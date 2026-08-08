const mongoose = require("mongoose");
const config = require("../config");
const RbacRole = require("../models/rbacRole.model");

const roles = [
  {
    key: "admin",
    name: "Admin",
    description: "Rol con acceso completo.",
    permissions: ["*", "boletas.manage"],
  },
  {
    key: "habilitaciones",
    name: "Habilitaciones",
    description: "Gestion operativa de habilitaciones.",
    permissions: ["habilitaciones.read"],
  },
  {
    key: "habilitaciones_jefe",
    name: "Habilitaciones Jefe",
    description: "Gestion de habilitaciones con permisos de exportacion.",
    permissions: ["habilitaciones.read", "habilitaciones.status", "habilitaciones.export"],
  },
  {
    key: "turnos",
    name: "Turnos",
    description: "Gestion operativa de turnos.",
    permissions: ["turnos.read"],
  },
  {
    key: "turnos_jefe",
    name: "Turnos Jefe",
    description: "Gestion avanzada de turnos.",
    permissions: ["turnos.read", "turnos.update"],
  },
  {
    key: "inspeccion",
    name: "Inspeccion",
    description: "Consulta de turnos de inspeccion.",
    permissions: ["turnos.read"],
  },
  {
    key: "inspeccion_jefe",
    name: "Inspeccion Jefe",
    description: "Gestion de estados de turnos de inspeccion.",
    permissions: ["turnos.read", "turnos.update"],
  },
  {
    key: "pagos_dobles",
    name: "Pagos dobles",
    description: "Gestion operativa de pagos dobles.",
    permissions: ["pagosDobles.read", "pagosDobles.update"],
  },
  {
    key: "pagos_dobles_jefe",
    name: "Pagos dobles Jefe",
    description: "Gestion de pagos dobles con permisos de exportacion.",
    permissions: ["pagosDobles.read", "pagosDobles.update", "pagosDobles.export"],
  },
  {
    key: "cementerio_funeraria",
    name: "Cementerio Funeraria",
    description: "Gestion operativa de certificados y fallecidos de la funeraria asociada.",
    permissions: ["cementerio.read", "cementerio.update"],
  },
  {
    key: "cementerio_funeraria_jefe",
    name: "Cementerio Funeraria Jefe",
    description: "Gestion operativa y confirmacion mensual de la funeraria asociada.",
    permissions: ["cementerio.read", "cementerio.update", "cementerio.confirm"],
  },
  {
    key: "cementerio_review",
    name: "Cementerio Revision",
    description: "Revision recaudatoria de declaraciones, comprobantes y periodos.",
    permissions: ["cementerio.review"],
  },
  {
    key: "cementerio_admin",
    name: "Cementerio Admin",
    description: "Administracion de funerarias y asociaciones de usuarios.",
    permissions: ["cementerio.read", "cementerio.admin"],
  },
  {
    key: "compras",
    name: "Compras",
    description: "Gestion de ordenes de compra sin vales.",
    permissions: ["compras.ordenes.read", "compras.ordenes.update", "compras.ordenes.delete"],
  },
  {
    key: "compras_jefe",
    name: "Compras Jefe",
    description: "Gestion completa de compras, combustible, vales y vehiculos.",
    permissions: [
      "compras.ordenes.read",
      "compras.ordenes.update",
      "compras.ordenes.delete",
      "compras.vales.read",
      "compras.vales.update",
      "compras.vehiculos.manage",
      "compras.dashboard",
      "compras.combustible.estadisticas",
    ],
  },
  {
    key: "hacienda",
    name: "Hacienda",
    description: "Gestion operativa de hacienda.",
    permissions: [
      "hacienda.obras.read",
      "hacienda.obras.update",
      "hacienda.indices.read",
      "hacienda.indices.update",
    ],
  },
  {
    key: "hacienda_jefe",
    name: "Hacienda Jefe",
    description: "Gestion avanzada de hacienda.",
    permissions: [
      "hacienda.obras.read",
      "hacienda.obras.update",
      "hacienda.obras.export",
      "hacienda.indices.read",
      "hacienda.indices.update",
      "dashboard.read",
      "activities.read",
    ],
  },
  {
    key: "abierto_anual",
    name: "Abierto Anual",
    description: "Consulta y gestion operativa de abierto anual.",
    permissions: ["abiertoAnual.read", "abiertoAnual.update"],
  },
  {
    key: "abierto_anual_jefe",
    name: "Abierto Anual Jefe",
    description: "Gestion avanzada de abierto anual con exportacion.",
    permissions: ["abiertoAnual.read", "abiertoAnual.update", "abiertoAnual.export", "abiertoAnual.admin"],
  },
  {
    key: "maestro_comercial",
    name: "Maestro Comercial",
    description: "Consulta y gestion del maestro comercial.",
    permissions: ["maestroComercial.read", "maestroComercial.update"],
  },
  {
    key: "modernizacion",
    name: "Modernizacion",
    description: "Gestion operativa de modernizacion.",
    permissions: ["modernizacion.read", "modernizacion.update"],
  },
  {
    key: "modernizacion_jefe",
    name: "Modernizacion Jefe",
    description: "Gestion avanzada de modernizacion.",
    permissions: ["modernizacion.read", "modernizacion.update", "system.config.admin"],
  },
  {
    key: "boletas",
    name: "Boletas",
    description: "Gestion de importacion y publicacion de boletas de tasas.",
    permissions: ["boletas.manage"],
  },
  {
    key: "gustavociriaco",
    name: "Gustavo Ciriaco",
    description: "Acceso de lectura a todos los modulos operativos, con gestion completa de modernizacion, obras e indices.",
    permissions: [
      "habilitaciones.read",
      "turnos.read",
      "pagosDobles.read",
      "cementerio.read",
      "compras.ordenes.read",
      "compras.vales.read",
      "compras.dashboard",
      "hacienda.obras.read",
      "hacienda.obras.update",
      "hacienda.obras.export",
      "hacienda.indices.read",
      "hacienda.indices.update",
      "abiertoAnual.read",
      "maestroComercial.read",
      "dashboard.read",
      "modernizacion.read",
      "modernizacion.update",
    ],
  },
  {
    key: "dashboard_viewer",
    name: "Dashboard Viewer",
    description: "Acceso al dashboard de estadisticas (/admin/dashboard); las pestañas visibles dependen de los demas permisos del usuario.",
    permissions: ["dashboard.read"],
  },
  {
    key: "habilitaciones_visibilidad",
    name: "Habilitaciones Visibilidad",
    description: "Puede marcar tramites de habilitacion como visibles/no visibles para no administradores.",
    permissions: ["habilitaciones.visibilidad"],
  },
  {
    key: "habilitaciones_export",
    name: "Habilitaciones Exportar",
    description: "Puede exportar el listado de solicitudes de habilitacion a Excel.",
    permissions: ["habilitaciones.export"],
  },
  {
    key: "habilitaciones_cambiar_estado",
    name: "Habilitaciones Cambiar Estado",
    description: "Puede aprobar/rechazar solicitudes de habilitacion individuales.",
    permissions: ["habilitaciones.status"],
  },
  {
    key: "compras_combustible_estadisticas",
    name: "Compras Combustible Estadisticas",
    description: "Puede ver la pestaña Estadisticas dentro de /compras/combustible.",
    permissions: ["compras.combustible.estadisticas"],
  },
];

const deprecatedRoleKeys = [
  "cementerio",
  "cementerio_jefe",
];

const deprecatedPermissionMap = {
  "obras.read": "hacienda.obras.read",
  "obras.update": "hacienda.obras.update",
  "obras.export": "hacienda.obras.export",
  "indices.read": "hacienda.indices.read",
  "indices.update": "hacienda.indices.update",
};

const removedPermissions = new Set([
  "hacienda.read",
  "hacienda.update",
  "habilitaciones.update",
  "compras.update",
]);

function migratePermissions(permissions = []) {
  return [
    ...new Set(
      permissions
        .map((permission) => deprecatedPermissionMap[permission] || permission)
        .filter((permission) => !removedPermissions.has(permission))
    ),
  ];
}

async function run() {
  if (!config.MONGO_URL) {
    throw new Error("Falta configurar MONGO_URL.");
  }

  await mongoose.connect(config.MONGO_URL, { useNewUrlParser: true });

  for (const role of roles) {
    await RbacRole.findOneAndUpdate(
      { key: role.key },
      { ...role, active: true },
      { upsert: true, new: true, runValidators: true }
    );
  }

  const existingRoles = await RbacRole.find({
    permissions: {
      $in: [
        ...Object.keys(deprecatedPermissionMap),
        ...removedPermissions,
      ],
    },
  });

  for (const role of existingRoles) {
    role.permissions = migratePermissions(role.permissions);
    await role.save();
  }

  await RbacRole.updateMany(
    { key: { $in: deprecatedRoleKeys } },
    { $set: { active: false } }
  );

  await mongoose.disconnect();
  console.log(`Roles creados/actualizados: ${roles.length}`);
  console.log(`Roles con permisos migrados: ${existingRoles.length}`);
  console.log(`Roles deprecados desactivados: ${deprecatedRoleKeys.join(", ")}`);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
