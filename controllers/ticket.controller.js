const TicketService = require("../services/ticket.service");


exports.getCurrent = async function () {
  try{
    const ticket = await TicketService.getCurrent();
    ticket[0].current += 1;

    await TicketService.update(ticket[0]._id,{
      current: ticket[0].current,
    });
    return ticket[0].current
  } catch (e) {
    return e.message
  }
};
