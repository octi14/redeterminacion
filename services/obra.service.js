let Recipe = require("../models/recipe.model");

const transformSort = (sort) => {
  const result = {};
  Object.entries(sort).forEach((entry) => {
    const [key, value] = entry;
    result[key] = value ? 1 : -1;
  });
  return result;
};

exports.findAll = async function (sort, skip, limit) {
  try {
    const transformedSort = transformSort(sort);
    return await Recipe.find().sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (recipeData) {
  const recipe = new Recipe(recipeData);
  await recipe.save();
  return recipe;
};

exports.update = async function (name, update) {
  return Recipe.findOneAndUpdate({ name: name }, update, {
    new: true,
  });
};

exports.delete = async function (name) {
  return Recipe.deleteOne({ name: name });
};

exports.getById = async function (id) {
  return Recipe.findById(id);
};

exports.getByName = async function (name) {
  return Recipe.find({ name: { $regex: name } });
};

exports.getMany = async function (ids) {
  return Recipe.find().where("_id").in(ids);
};
