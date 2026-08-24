const unzipper = require("unzipper");

function decodeXml(text) {
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(src, name) {
  const match = String(src).match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function colIndex(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i);
  if (!letters) return 0;
  let n = 0;
  for (const ch of letters[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function textsInNode(xml) {
  const parts = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi;
  let match;
  while ((match = re.exec(xml))) parts.push(decodeXml(match[1]));
  return parts.join("");
}

function cellValue(attrs, inner, shared) {
  const type = attr(attrs, "t");
  if (type === "s") {
    const match = inner.match(/<v>([\s\S]*?)<\/v>/i);
    return shared[Number(match && match[1])] || "";
  }
  if (type === "inlineStr") return textsInNode(inner);
  const match = inner.match(/<v>([\s\S]*?)<\/v>/i);
  if (!match) return "";
  const raw = decodeXml(match[1]);
  if (type === "b") return raw === "1" || raw === "true";
  if (type === "n" || type === "d" || type === "") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  return raw;
}

function parseRowXml(xml, shared) {
  const rowMatch = xml.match(/\sr="(\d+)"/);
  const number = rowMatch ? Number(rowMatch[1]) : 0;
  const values = [];
  const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
  let match;
  while ((match = cellRe.exec(xml))) {
    const index = colIndex(attr(match[1], "r"));
    if (!index) continue;
    values[index] = cellValue(match[1], match[2], shared);
  }
  return { number, values };
}

async function* iterateNodes(stream, closeTag) {
  let buf = "";
  const closeLen = closeTag.length;
  const openTag = closeTag.replace("/", "").replace(">", "");
  for await (const chunk of stream) {
    buf += chunk.toString("utf8");
    let idx;
    while ((idx = buf.indexOf(closeTag)) !== -1) {
      const end = idx + closeLen;
      const start = buf.lastIndexOf(openTag, idx);
      if (start === -1) {
        buf = buf.slice(end);
        continue;
      }
      yield buf.slice(start, end);
      buf = buf.slice(end);
    }
    if (buf.length > 8 * 1024 * 1024) buf = buf.slice(-1024 * 1024);
  }
}

async function loadSharedStrings(stream) {
  const strings = [];
  for await (const node of iterateNodes(stream, "</si>")) {
    strings.push(textsInNode(node));
  }
  return strings;
}

async function* filasXlsx(filePath) {
  const zip = await unzipper.Open.file(filePath);
  const ss = zip.files.find((file) => file.path === "xl/sharedStrings.xml");
  const shared = ss ? await loadSharedStrings(ss.stream()) : [];
  const sheet =
    zip.files.find((file) => file.path === "xl/worksheets/sheet1.xml") ||
    zip.files.find((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.path));
  if (!sheet) return;
  for await (const node of iterateNodes(sheet.stream(), "</row>")) {
    yield parseRowXml(node, shared);
  }
}

module.exports = { filasXlsx };
