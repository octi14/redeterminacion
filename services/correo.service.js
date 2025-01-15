const nodemailer = require('nodemailer');

exports.enviarCorreo = async (destinatario, asunto, mensaje) => {
  const transporter = nodemailer.createTransport({
    host: 'mail.gesell.gob.ar', // Proporcionado por el proveedor
    port: 465,               // Cambiar según el puerto necesario
    secure: true,           // Cambiar a true si usas SSL (puerto 465)
    auth: {
      user: 'no-contestar@gesell.gob.ar',
      pass: '[x$F]oU)0kvJ,DenY^',
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
