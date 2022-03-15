const express = require("express");
const cors = require("cors");
const jwt = require("../utils/jwt");

const UserRoute = require("../routes/user.route");
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jwt());
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "OK",
  });
});

app.use("/users", UserRoute);

module.exports = app;
