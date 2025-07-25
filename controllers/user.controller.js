const UserService = require("../services/user.service");


exports.findAll = async function (req, res) {
  try{
    const users = await UserService.getAll();
    return res.status(200).json({
      message: "Users",
      data: users,
    })
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
}

exports.authenticate = async function (req, res) {
  try {
    // TODO: validate req.body
    const { username, password } = req.body;

    const authenticatedUser = await UserService.authenticate({
      username,
      password,
    });

    if (authenticatedUser) {
      return res.status(200).json({
        message: "Authenticated",
        data: authenticatedUser,
      });
    }
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.register = async function (req, res) {
  try {
    // TODO: validate req.body
    const { username, password, admin } = req.body;

    const createdUser = await UserService.create({
      username,
      password,
      admin,
    });


    return res.status(201).json({
      message: "Created",
      data: createdUser,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.changePassword = async function(req, res) {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    // Lógica para cambiar la contraseña utilizando el servicio UserService
    const success = await UserService.changePassword(userId, oldPassword, newPassword);

    if (success) {
      return res.status(200).json({ message: 'Contraseña cambiada exitosamente' });
    } else {
      return res.status(400).json({ message: 'No se pudo cambiar la contraseña' });
    }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.checkToken = async function(req, res){
  try{
    const token = req.body.token;
    let validez = await UserService.checkTokenValidity(token);
    return res.status(200).json({
      data: validez,
    });
  }catch(e){
    return res.status(400).json({
      meesage: e.message,
    })
  }
};
