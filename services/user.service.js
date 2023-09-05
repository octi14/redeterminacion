const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
let User = require("../models/user.model");

exports.getAll = async function () {
  return User.find()
}

exports.authenticate = async function ({ username, password }) {
  const user = await User.findOne({ username });
  if (!user) {
    // Usuario no encontrado, lanza una excepción personalizada
    throw new Error("Usuario no encontrado");
  }
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ sub: user.id }, config.TOKEN_SECRET, {
      expiresIn: config.TOKEN_TIMEOUT,
    });

    // borro la contraseña para no devolverla en la respuesta
    const responseUser = user.toJSON();
    delete responseUser.password;

    return {
      ...responseUser,
      token,
    };
  } else {
    // Contraseña incorrecta, lanza una excepción personalizada
    throw new Error("Contraseña incorrecta");
  }
};

exports.create = async function ({ username, password, admin }) {
  // validate
  if (await User.findOne({ username })) {
    throw "El usuario [" + username + "] ya existe";
  }
  if (!password) {
    throw "La contraseña es requerida";
  }

  const user = await User.create({
    username,
    password: bcrypt.hashSync(password),
    admin,
  });

  // borro la contraseña para no devolverla en la respuesta
  const responseUser = user.toJSON();
  delete responseUser.password;

  return responseUser;
};

exports.getById = async function (id) {
  return User.findById(id, { password: false });
};

exports.update = async function ({ id, username }) {
  return User.findByIdAndUpdate(
    id,
    { username },
    {
      returnDocument: "after",
    }
  );
};

exports.checkTokenValidity = async function(token) {
  try {
    const decodedToken = jwt.verify(token, config.TOKEN_SECRET);
    return !decodedToken.exp || Date.now() <= decodedToken.exp * 1000;
  } catch (error) {
    return false;
  }
}
