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

    return res.status(200).json({
      message: "Authenticated",
      data: authenticatedUser,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.register = async function (req, res) {
  try {
    // TODO: validate req.body
    const { username, password } = req.body;

    const createdUser = await UserService.create({
      username,
      password,
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

exports.getProfile = async function (req, res) {
  try {
    const { userId } = req.params;
    const user = await UserService.getById(userId);

    // armo un listado de IDs de las recetas creadas por el usuario
    const userRecipes = (await RecipeService.getCreatedBy(userId)).map(
      (recipe) => recipe._id
    );

    const userProfile = {
      ...user.toJSON(),
      createdRecipes: userRecipes,
    };

    return res.status(200).json({
      data: userProfile,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.updateProfile = async function (req, res) {
  try {
    const { sub: authUserId } = req.user;
    const { userId } = req.params;
    const { name, email, image } = req.body;

    console.log("updateProfile", {
      authUserId,
      userId,
      body: req.body,
    });

    if (authUserId !== userId) {
      throw new Error("permission denied");
    }

    const user = await UserService.update({
      id: userId,
      name,
      image,
      email,
    });

    console.log("updatedUser", user);

    // armo un listado de IDs de las recetas creadas por el usuario
    const userRecipes = (await RecipeService.getCreatedBy(userId)).map(
      (recipe) => recipe._id
    );

    const userProfile = {
      ...user.toJSON(),
      createdRecipes: userRecipes,
    };

    return res.status(200).json({
      data: userProfile,
    });
  } catch (e) {
    console.log("error", e);
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
