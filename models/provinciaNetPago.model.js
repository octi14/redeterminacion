const { Schema, model } = require("mongoose");

const payerSchema = new Schema(
  {
    first_name: { type: String },
    last_name: { type: String },
    email: { type: String },
    document_type: { type: String, default: "1" },
    document_number: { type: String },
    gender: { type: String },
  },
  { _id: false }
);

const paymentItemSchema = new Schema(
  {
    amount: { type: String },
    detail: { type: String },
    barcode: { type: String },
    service: { type: String },
    paid: { type: Boolean },
  },
  { _id: false }
);

const provinciaNetPagoSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["Instanciado", "Proceso", "Finalizado", "Cancelado", "Parcial"],
      default: "Instanciado",
      index: true,
    },
    electronicCode: { type: String },
    url: { type: String },
    totalAmount: { type: String },
    totalPaid: { type: String },
    totalRefund: { type: String },
    payer: payerSchema,
    payments: [paymentItemSchema],
    tipoTasa: { type: String, default: "URBANA", index: true },
    objetoClave: { type: String, index: true },
    expiredAt: { type: Date },
    methodSelected: { type: String },
    rawWebhook: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "provincianetpagos",
  }
);

module.exports = model("provinciaNetPago", provinciaNetPagoSchema);
