let TicketRecaudaciones = require("../models/ticketRecaudaciones.model");

exports.getCurrent = async function () {
  try {
    return await TicketRecaudaciones.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting tickets.");
  }
};

exports.update = async function (id, update) {
  return TicketRecaudaciones.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};
