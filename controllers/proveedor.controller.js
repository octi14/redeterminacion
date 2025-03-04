const Proveedor = require("../models/proveedor.model");

exports.getAll = async function (req, res) {
  try{
    const response = await Proveedor.find();
    return res.status(200).json({
      data: response,
    });
  } catch (e) {
    return e.message
  }
};
