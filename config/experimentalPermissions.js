const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  ROLES_READ: "roles.read",
  ROLES_MANAGE: "roles.manage",

  HABILITACIONES_READ: "habilitaciones.read",
  HABILITACIONES_UPDATE: "habilitaciones.update",
  HABILITACIONES_STATUS: "habilitaciones.status",
  HABILITACIONES_EXPORT: "habilitaciones.export",

  TURNOS_READ: "turnos.read",
  TURNOS_UPDATE: "turnos.update",

  PAGOS_DOBLES_READ: "pagosDobles.read",
  PAGOS_DOBLES_UPDATE: "pagosDobles.update",
  PAGOS_DOBLES_EXPORT: "pagosDobles.export",

  CEMENTERIO_READ: "cementerio.read",
  CEMENTERIO_UPDATE: "cementerio.update",
  CEMENTERIO_REVIEW: "cementerio.review",

  COMPRAS_READ: "compras.read",
  COMPRAS_UPDATE: "compras.update",
  COMPRAS_ORDENES_READ: "compras.ordenes.read",
  COMPRAS_ORDENES_UPDATE: "compras.ordenes.update",
  COMPRAS_ORDENES_DELETE: "compras.ordenes.delete",
  COMPRAS_VALES_READ: "compras.vales.read",
  COMPRAS_VALES_UPDATE: "compras.vales.update",
  COMPRAS_VEHICULOS_MANAGE: "compras.vehiculos.manage",
  COMPRAS_DASHBOARD: "compras.dashboard",

  HACIENDA_READ: "hacienda.read",
  HACIENDA_UPDATE: "hacienda.update",

  OBRAS_READ: "obras.read",
  OBRAS_UPDATE: "obras.update",
  OBRAS_EXPORT: "obras.export",

  INDICES_READ: "indices.read",
  INDICES_UPDATE: "indices.update",

  ABIERTO_ANUAL_READ: "abiertoAnual.read",
  ABIERTO_ANUAL_UPDATE: "abiertoAnual.update",
  ABIERTO_ANUAL_EXPORT: "abiertoAnual.export",

  MAESTRO_COMERCIAL_READ: "maestroComercial.read",
  MAESTRO_COMERCIAL_UPDATE: "maestroComercial.update",

  DASHBOARD_READ: "dashboard.read",
  ACTIVITIES_READ: "activities.read",

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
