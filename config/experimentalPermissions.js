const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  ROLES_READ: "roles.read",
  ROLES_MANAGE: "roles.manage",

  HABILITACIONES_READ: "habilitaciones.read",
  HABILITACIONES_STATUS: "habilitaciones.status",
  HABILITACIONES_EXPORT: "habilitaciones.export",
  HABILITACIONES_VISIBILIDAD: "habilitaciones.visibilidad",

  TURNOS_READ: "turnos.read",
  TURNOS_UPDATE: "turnos.update",

  PAGOS_DOBLES_READ: "pagosDobles.read",
  PAGOS_DOBLES_UPDATE: "pagosDobles.update",
  PAGOS_DOBLES_EXPORT: "pagosDobles.export",

  CEMENTERIO_READ: "cementerio.read",
  CEMENTERIO_UPDATE: "cementerio.update",
  CEMENTERIO_CONFIRM: "cementerio.confirm",
  CEMENTERIO_REVIEW: "cementerio.review",
  CEMENTERIO_ADMIN: "cementerio.admin",

  COMPRAS_ORDENES_READ: "compras.ordenes.read",
  COMPRAS_ORDENES_UPDATE: "compras.ordenes.update",
  COMPRAS_ORDENES_DELETE: "compras.ordenes.delete",
  COMPRAS_VALES_READ: "compras.vales.read",
  COMPRAS_VALES_UPDATE: "compras.vales.update",
  COMPRAS_VEHICULOS_MANAGE: "compras.vehiculos.manage",
  COMPRAS_DASHBOARD: "compras.dashboard",

  HACIENDA_OBRAS_READ: "hacienda.obras.read",
  HACIENDA_OBRAS_UPDATE: "hacienda.obras.update",
  HACIENDA_OBRAS_EXPORT: "hacienda.obras.export",

  HACIENDA_INDICES_READ: "hacienda.indices.read",
  HACIENDA_INDICES_UPDATE: "hacienda.indices.update",

  ABIERTO_ANUAL_READ: "abiertoAnual.read",
  ABIERTO_ANUAL_UPDATE: "abiertoAnual.update",
  ABIERTO_ANUAL_EXPORT: "abiertoAnual.export",
  ABIERTO_ANUAL_ADMIN: "abiertoAnual.admin",

  MAESTRO_COMERCIAL_READ: "maestroComercial.read",
  MAESTRO_COMERCIAL_UPDATE: "maestroComercial.update",

  DASHBOARD_READ: "dashboard.read",
  ACTIVITIES_READ: "activities.read",
  SYSTEM_CONFIG_ADMIN: "system.config.admin",

  BOLETAS_MANAGE: "boletas.manage",

  MODERNIZACION_READ: "modernizacion.read",
  MODERNIZACION_UPDATE: "modernizacion.update",
};

const LEGACY_ROLE_PERMISSIONS = {
  master: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_MANAGE,
  ],
};

module.exports = {
  PERMISSIONS,
  LEGACY_ROLE_PERMISSIONS,
};
