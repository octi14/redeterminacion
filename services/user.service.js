const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
let User = require("../models/user.model");

exports.getAll = async function () {
  return User.find()
}

exports.authenticate = async function ({ username, password }) {
  const user = await User.findOne({ username });
  console.log(password + user.password + "|");
  console.log(bcrypt.compareSync(password,user.password));
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
  }
};

exports.create = async function ({ username, password }) {
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
