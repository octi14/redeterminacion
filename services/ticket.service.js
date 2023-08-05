let Ticket = require("../models/ticket.model");

exports.getCurrent = async function () {
  try {
    return await Ticket.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting tickets.");
  }
};

exports.update = async function (id, update) {
  return Ticket.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};
