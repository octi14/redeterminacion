const TicketRecaudacionesService = require("../services/ticketRecaudaciones.service");


exports.getCurrent = async function () {
  try{
    const ticket = await TicketRecaudacionesService.getCurrent();
    ticket[0].current += 1;

    await TicketRecaudacionesService.update(ticket[0]._id,{
      current: ticket[0].current,
    });
    return ticket[0].current
  } catch (e) {
    return e.message
  }
};
