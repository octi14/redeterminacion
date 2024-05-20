exports.get = async function (req, res) {
  try {
    const currentTime = new Date();
    return res.status(200).json({
      message: "Current Server Time",
      data: currentTime,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
