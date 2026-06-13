const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const MAX_BYTES = 60 * 1024 * 1024;
const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

module.exports = function xlsxTemporal(req, res, next) {
  if (!String(req.headers["content-type"] || "").includes(XLSX_CONTENT_TYPE)) {
    return res.status(415).json({ message: "Debe enviar un archivo XLSX." });
  }

  const filePath = path.join(os.tmpdir(), `tasa-${Date.now()}-${crypto.randomUUID()}.xlsx`);
  const output = fs.createWriteStream(filePath, { flags: "wx" });
  const hash = crypto.createHash("sha256");
  let size = 0;
  let finished = false;
  let tooLarge = false;

  function cleanup() {
    if (!finished) output.destroy();
    fs.promises.unlink(filePath).catch(() => {});
  }

  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      tooLarge = true;
      return;
    }
    hash.update(chunk);
    if (!output.write(chunk)) {
      req.pause();
      output.once("drain", () => req.resume());
    }
  });
  req.on("end", () => output.end());
  req.on("aborted", cleanup);
  req.on("error", cleanup);
  output.on("error", next);
  output.on("finish", () => {
    finished = true;
    if (tooLarge) {
      cleanup();
      return res.status(413).json({ message: "El archivo supera el límite permitido de 60 MB." });
    }
    if (!size) {
      cleanup();
      return res.status(400).json({ message: "Debe enviar un archivo XLSX." });
    }
    req.archivoTemporal = { path: filePath, size, hash: hash.digest("hex") };
    return next();
  });
};
