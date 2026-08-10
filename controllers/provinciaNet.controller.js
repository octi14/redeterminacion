const ProvinciaNetService = require("../services/provinciaNet.service");

exports.createPreorder = async function createPreorder(req, res) {
  try {
    const {
      payer,
      payments,
      objetoClave,
      useHomologacionFixture,
    } = req.body || {};

    if (!payer) {
      return res.status(400).json({ message: "Falta payer en el body." });
    }

    const data = await ProvinciaNetService.createPreorder({
      payer,
      payments,
      objetoClave,
      useHomologacionFixture:
        useHomologacionFixture !== false &&
        (!Array.isArray(payments) || payments.length === 0),
    });

    return res.status(201).json({ data });
  } catch (e) {
    console.error("provinciaNet.createPreorder:", e.message, e.data || "");
    return res.status(e.status || 500).json({
      message: e.message || "Error al crear intención de pago",
      data: e.data,
    });
  }
};

exports.getEstado = async function getEstado(req, res) {
  try {
    const { uuid } = req.params;
    if (!uuid) {
      return res.status(400).json({ message: "Falta uuid" });
    }
    const data = await ProvinciaNetService.getEstado(uuid);
    return res.status(200).json({ data });
  } catch (e) {
    console.error("provinciaNet.getEstado:", e.message);
    return res.status(e.status || 500).json({
      message: e.message || "Error al consultar estado",
      data: e.data,
    });
  }
};

exports.webhook = async function webhook(req, res) {
  try {
    const data = await ProvinciaNetService.applyWebhookPayload(req.body);
    return res.status(200).json({ message: "OK", data: { uuid: data.uuid, status: data.status } });
  } catch (e) {
    console.error("provinciaNet.webhook:", e.message);
    return res.status(e.status || 500).json({
      message: e.message || "Error procesando webhook",
    });
  }
};
