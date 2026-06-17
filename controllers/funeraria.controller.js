const Funeraria = require('../models/funeraria.model');
const User = require('../models/user.model');
const AuthService = require('../services/cementerioAuth.service');

const sendError = (res, error) => res.status(error.status || 400).json({ message: error.message });

exports.getAll = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    return res.status(200).json({ data: await Funeraria.find().sort({ nombre: 1 }) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.create = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    const funeraria = await Funeraria.create(req.body.funeraria || req.body);
    return res.status(201).json({ data: funeraria });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.update = async function (req, res) {
  try {
    const user = await AuthService.getUser(req);
    AuthService.requirePermission(user, 'cementerio.review');
    const funeraria = await Funeraria.findByIdAndUpdate(req.params.id, req.body.funeraria || req.body, { new: true });
    if (!funeraria) return res.status(404).json({ message: 'Funeraria no encontrada.' });
    return res.status(200).json({ data: funeraria });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.associateUser = async function (req, res) {
  try {
    const currentUser = await AuthService.getUser(req);
    AuthService.requirePermission(currentUser, 'cementerio.review');
    const funeraria = await Funeraria.findById(req.params.id);
    if (!funeraria) return res.status(404).json({ message: 'Funeraria no encontrada.' });
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    
    user.funerariaId = funeraria._id;
    await user.save();
    return res.status(200).json({ data: user });
  } catch (error) {
    return sendError(res, error);
  }
};
