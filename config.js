// eslint-disable-next-line no-unused-vars
const dotenv = require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  HOST: process.env.HOST || "127.0.0.1",
  PORT: process.env.PORT || 5000,
  MONGO_URL: process.env.MONGO_URL,
  TOKEN_SECRET: process.env.TOKEN_SECRET || "secret",
  TOKEN_TIMEOUT: process.env.TOKEN_TIMEOUT || "48h",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-2",
};
