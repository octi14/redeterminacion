let Item = require("../models/item.model");

exports.findAll = async function () {
  try {
    return await Item.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting items.");
  }
};

exports.create = async function ({ name }) {
  await Item.ensureIndexes();
  return await Item.create({ name });
};

exports.update = async function (name, update) {
  await Item.ensureIndexes();
  return Item.findOneAndUpdate({ name: name }, update, {
    new: true,
  });
};

exports.delete = async function (name) {
  return Item.deleteOne({ name: name });
};

exports.getByName = async function (name) {
  return Item.find({
    name: name,
  });
};

exports.getOrCreate = async function (name) {
  const found = await Item.findOne({
    name,
  });
  return (
    found ||
    Item.create({
      name,
    })
  );
};
