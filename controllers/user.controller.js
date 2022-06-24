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

exports.getCurrent = async function (req, res) {
  try {
    const { sub: userId } = req.user;
    let user = await UserService.getById(userId);
    return res.status(200).json({
      data: user,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
