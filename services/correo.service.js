const nodemailer = require('nodemailer');
const config = require('../config');

exports.enviarCorreo = async (destinatario, asunto, mensaje) => {
  if (!config.MAILER_PASSWORD) {
    throw new Error('Falta MAILER_PASSWORD');
  }

  const transporter = nodemailer.createTransport({
    host: 'mail.gesell.gob.ar',
    port: 465,
    secure: true,
    auth: {
      user: 'no-contestar@gesell.gob.ar',
      pass: config.MAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'no-contestar@gesell.gob.ar',
    to: destinatario,
    subject: asunto,
    text: mensaje,
  };

  return await transporter.sendMail(mailOptions);
};
