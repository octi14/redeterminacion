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
  const re = /<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>/gi;
  let match;
  while ((match = re.exec(xml))) parts.push(decodeXml(match[1]));
  return parts.join("");
}

function cellValue(attrs, inner, shared) {
  const type = attr(attrs, "t");
  if (type === "s") {
    const match = inner.match(/<(?:[\w-]+:)?v>([\s\S]*?)<\/(?:[\w-]+:)?v>/i);
    const idx = Number(match && match[1]);
    if (Number.isInteger(idx) && shared[idx] != null) return shared[idx];
    return "";
  }
  if (type === "inlineStr") return textsInNode(inner);
  const match = inner.match(/<(?:[\w-]+:)?v>([\s\S]*?)<\/(?:[\w-]+:)?v>/i);
  if (!match) return textsInNode(inner);
  const raw = decodeXml(match[1]);
  if (type === "b") return raw === "1" || raw === "true";
  if (type === "n" || type === "d" || type === "") {
    if (/^\d{12,}$/.test(raw)) return raw;
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  return raw;
}

function parseRowXml(xml, shared) {
  const rowMatch = xml.match(/\sr="(\d+)"/);
  const number = rowMatch ? Number(rowMatch[1]) : 0;
  const values = [];
  const cellRe = /<(?:[\w-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?c>/gi;
  let match;
  let sequential = 0;
  while ((match = cellRe.exec(xml))) {
    sequential += 1;
    const index = colIndex(attr(match[1], "r")) || sequential;
    values[index] = cellValue(match[1], match[2], shared);
  }
  return { number, values };
}

function findEntry(zip, test) {
  return zip.files.find((file) => test(String(file.path || "").replace(/\\/g, "/")));
}

async function loadSharedStrings(entry) {
  if (!entry) return [];
  const xml = (await entry.buffer()).toString("utf8");
  const strings = [];
  const siRe = /<(?:[\w-]+:)?si\b[\s\S]*?<\/(?:[\w-]+:)?si>/gi;
  let match;
  while ((match = siRe.exec(xml))) strings.push(textsInNode(match[0]));
  console.log(`Import urbana: ${strings.length} shared strings`);
  return strings;
}

async function* iterateRows(stream) {
  let buf = "";
  for await (const chunk of stream) {
    buf += chunk.toString("utf8");
    let idx;
    while ((idx = buf.search(/<\/(?:[\w-]+:)?row>/i)) !== -1) {
      const close = buf.slice(idx).match(/<\/(?:[\w-]+:)?row>/i);
      const end = idx + close[0].length;
      const start = buf.lastIndexOf("<row", idx);
      const startNs = buf.lastIndexOf(":row", idx);
      let open = start;
      if (startNs !== -1 && (start === -1 || startNs > start)) {
        const lt = buf.lastIndexOf("<", startNs);
        open = lt !== -1 ? lt : startNs;
      }
      if (open === -1 || open > idx) {
        buf = buf.slice(end);
        continue;
      }
      yield buf.slice(open, end);
      buf = buf.slice(end);
    }
  }
}

async function* filasXlsx(filePath) {
  const zip = await unzipper.Open.file(filePath);
  const ss = findEntry(zip, (path) => /xl\/sharedstrings\.xml$/i.test(path));
  const shared = await loadSharedStrings(ss);
  const sheet =
    findEntry(zip, (path) => path === "xl/worksheets/sheet1.xml") ||
    findEntry(zip, (path) => /xl\/worksheets\/sheet\d+\.xml$/i.test(path));
  if (!sheet) return;
  for await (const node of iterateRows(sheet.stream())) {
    yield parseRowXml(node, shared);
  }
}

module.exports = { filasXlsx };
