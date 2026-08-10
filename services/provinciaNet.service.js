const config = require("../config.js");
const ProvinciaNetPago = require("../models/provinciaNetPago.model.js");

const STATUS_PRIORITY = {
  Instanciado: 1,
  Proceso: 2,
  Parcial: 3,
  Finalizado: 4,
  Cancelado: 4,
};

function amountToString(value) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error("Monto inválido");
  }
  return n.toFixed(2);
}

function normalizePayer(payer = {}) {
  return {
    first_name: String(payer.first_name ?? ""),
    last_name: String(payer.last_name ?? ""),
    email: String(payer.email ?? ""),
    document_type: String(payer.document_type ?? "1"),
    document_number: String(payer.document_number ?? ""),
    gender: String(payer.gender ?? "1"),
    locked_payer:
      typeof payer.locked_payer === "boolean" ? payer.locked_payer : false,
  };
}

function normalizePayments(payments) {
  if (!Array.isArray(payments) || payments.length < 1) {
    throw new Error("Debe incluir al menos un ítem de pago");
  }
  if (payments.length > 10) {
    throw new Error("Máximo 10 ítems por intención de pago");
  }
  const service = config.PROVINCIA_NET_SERVICE_CODE;
  return payments.map((item) => ({
    amount: amountToString(item.amount),
    detail: String(item.detail ?? ""),
    barcode: String(item.barcode ?? ""),
    service: String(item.service || service),
  }));
}

/** Fixture para homologación hasta tener deuda urbana real.
 * Requiere PROVINCIA_NET_HOMOLOG_BARCODE: PN valida la barra (ceros → "barra erronea").
 */
function buildHomologacionFixture() {
  const barcode = String(config.PROVINCIA_NET_HOMOLOG_BARCODE || "").trim();
  if (!barcode || /^0+$/.test(barcode)) {
    const err = new Error(
      "Falta un código de barras válido para el pago de prueba. Configurá PROVINCIA_NET_HOMOLOG_BARCODE en el .env (una barra real o la que indique Provincia NET)."
    );
    err.status = 400;
    throw err;
  }
  return [
    {
      amount: amountToString(config.PROVINCIA_NET_HOMOLOG_AMOUNT || "1000.00"),
      detail:
        "Municipalidad de Villa Gesell. Tasa por Servicios Urbanos",
      barcode,
      service: config.PROVINCIA_NET_SERVICE_CODE,
    },
  ];
}

function sumAmounts(payments) {
  const total = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  return amountToString(total);
}

async function callProvinciaNetPreorder(payload) {
  const baseUrl = (config.PROVINCIA_NET_API_URL || "").replace(/\/$/, "");
  const apiKey = config.PROVINCIA_NET_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Faltan PROVINCIA_NET_API_URL o PROVINCIA_NET_API_KEY en la configuración"
    );
  }

  const url = `${baseUrl}/api/v1/service/preorder`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const nested =
      body?.data?.data?.message ||
      body?.data?.data?.error ||
      body?.data?.message ||
      body?.data?.error ||
      body?.message;
    const err = new Error(
      nested || `Error Provincia NET (${response.status})`
    );
    err.status = response.status >= 500 ? 502 : response.status;
    err.data = body;
    throw err;
  }
  return body;
}

async function callProvinciaNetEstado(uuid) {
  const baseUrl = (config.PROVINCIA_NET_API_URL || "").replace(/\/$/, "");
  const apiKey = config.PROVINCIA_NET_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Faltan PROVINCIA_NET_API_URL o PROVINCIA_NET_API_KEY en la configuración"
    );
  }

  const url = `${baseUrl}/api/v1/service/preorder/${encodeURIComponent(uuid)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "x-api-key": apiKey },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      body?.message || `Error consultando estado (${response.status})`
    );
    err.status = response.status;
    err.data = body;
    throw err;
  }
  return body;
}

exports.createPreorder = async function createPreorder({
  payer,
  payments,
  objetoClave,
  useHomologacionFixture,
} = {}) {
  const normalizedPayer = normalizePayer(payer);
  const paymentItems =
    useHomologacionFixture || !payments?.length
      ? buildHomologacionFixture()
      : normalizePayments(payments);

  const payload = {
    payer: normalizedPayer,
    payments: paymentItems,
  };

  const pnResponse = await callProvinciaNetPreorder(payload);
  const uuid = pnResponse?.data?.preorder_uuid;
  const checkoutUrl = pnResponse?.data?.url;

  if (!uuid || !checkoutUrl) {
    const err = new Error("Respuesta de Provincia NET sin url o preorder_uuid");
    err.status = 502;
    err.data = pnResponse;
    throw err;
  }

  const totalAmount = sumAmounts(paymentItems);
  const doc = await ProvinciaNetPago.findOneAndUpdate(
    { uuid },
    {
      uuid,
      status: "Instanciado",
      url: checkoutUrl,
      totalAmount,
      payer: {
        first_name: normalizedPayer.first_name,
        last_name: normalizedPayer.last_name,
        email: normalizedPayer.email,
        document_type: normalizedPayer.document_type,
        document_number: normalizedPayer.document_number,
        gender: normalizedPayer.gender,
      },
      payments: paymentItems,
      tipoTasa: "URBANA",
      objetoClave: objetoClave || null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    preorder_uuid: uuid,
    url: checkoutUrl,
    status: doc.status,
    totalAmount: doc.totalAmount,
  };
};

exports.getEstado = async function getEstado(uuid, { refreshFromPn = true } = {}) {
  let local = await ProvinciaNetPago.findOne({ uuid }).lean();

  if (refreshFromPn && config.PROVINCIA_NET_API_KEY) {
    try {
      const pn = await callProvinciaNetEstado(uuid);
      const data = pn?.data || {};
      if (data.status || data.uuid) {
        local = await exports.applyWebhookPayload({
          status: data.status || local?.status || "Instanciado",
          preorder: {
            uuid: data.uuid || uuid,
            electronic_code: data.electronic_code,
            payer: data.payer,
            payments: data.payments,
            total_amount: data.total_amount,
            total_paid: data.total_paid,
            total_refund: data.total_refund,
            created_at: data.created_at,
            expired_at: data.expired_at,
            method_selected: data.method_selected,
          },
        });
      }
    } catch (e) {
      if (!local) throw e;
      console.error("No se pudo refrescar estado desde PN:", e.message);
    }
  }

  if (!local) {
    const err = new Error("Pago no encontrado");
    err.status = 404;
    throw err;
  }
  return local;
};

exports.applyWebhookPayload = async function applyWebhookPayload(payload) {
  const status = payload?.status;
  const preorder = payload?.preorder;
  if (!status || !preorder?.uuid) {
    const err = new Error("Webhook inválido: faltan status o preorder.uuid");
    err.status = 400;
    throw err;
  }

  const existing = await ProvinciaNetPago.findOne({ uuid: preorder.uuid });
  const incomingPriority = STATUS_PRIORITY[status] ?? 0;
  const currentPriority = existing
    ? STATUS_PRIORITY[existing.status] ?? 0
    : 0;

  if (existing && incomingPriority < currentPriority) {
    return existing.toObject();
  }

  const payments = Array.isArray(preorder.payments)
    ? preorder.payments.map((item) => ({
        amount: item.amount != null ? String(item.amount) : undefined,
        detail: item.detail,
        barcode: item.barcode,
        service: item.service,
        paid: typeof item.paid === "boolean" ? item.paid : undefined,
      }))
    : undefined;

  const update = {
    uuid: preorder.uuid,
    status,
    electronicCode: preorder.electronic_code,
    totalAmount: preorder.total_amount,
    totalPaid: preorder.total_paid,
    totalRefund: preorder.total_refund,
    methodSelected: preorder.method_selected,
    rawWebhook: payload,
  };

  if (preorder.payer) {
    update.payer = {
      first_name: preorder.payer.first_name,
      last_name: preorder.payer.last_name,
      email: preorder.payer.email,
      document_type: preorder.payer.document_type || "1",
      document_number: preorder.payer.document_number,
      gender: preorder.payer.gender,
    };
  }
  if (payments) update.payments = payments;
  if (preorder.expired_at) update.expiredAt = new Date(preorder.expired_at);

  const doc = await ProvinciaNetPago.findOneAndUpdate(
    { uuid: preorder.uuid },
    { $set: update, $setOnInsert: { tipoTasa: "URBANA" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return doc.toObject();
};

exports.STATUS_PRIORITY = STATUS_PRIORITY;
