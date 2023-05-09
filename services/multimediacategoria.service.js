let MultimediaCategoria = require("../models/multimediaCategoria.model");

const transformSort = (sort) => {
  const result = {};
  Object.entries(sort).forEach((entry) => {
    const [key, value] = entry;
    result[key] = value ? 1 : -1;
  });
  return result;
};

exports.findAll = async function () {
  try {
    // const transformedSort = transformSort(sort);
    return await MultimediaCategoria.find()
    // .sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function ({nombre}) {
  const file = new MultimediaCategoria({nombre});
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return MultimediaCategoria.findOneAndUpdate({ id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return MultimediaCategoria.deleteOne({ id: id });
};
