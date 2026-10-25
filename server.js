/* =====================================================================
   server.js - backend. Zero dependencies (only Node's built-in modules).
   Run:  node server.js     then open http://localhost:3000

   POST /api/calculate
     body : { items:[{weight, rate, makingPct}], received }
     reply: { items:[{amount, making, total}], bill:{...} }   (money in paise)
   All billing maths happens here, using calc.js. The browser only displays it.
   ===================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { calcItem, calcBill } = require("./calc.js");

const PORT = process.env.PORT || 3000;
const MAX_BODY = 100 * 1024; // 100 KB
const MAX_ITEMS = 200;

/* only these files can be downloaded - nothing else on disk is reachable */
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "application/javascript; charset=utf-8"],
  "/calc.js": ["calc.js", "application/javascript; charset=utf-8"],
  "/heade.png": ["heade.png", "image/png"],   // invoice header  - replace this file to change it
  "/upi.png": ["upi.png", "image/png"],       // UPI QR code    - replace this file to change it
};

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function validate(body) {
  if (!body || !Array.isArray(body.items)) return "items must be an array";
  if (body.items.length > MAX_ITEMS) return `too many items (max ${MAX_ITEMS})`;
  for (const [i, it] of body.items.entries()) {
    const n = i + 1;
    if (!it || !isNum(it.weight) || it.weight < 0 || it.weight > 100000) return `item ${n}: invalid weight`;
    if (!isNum(it.rate) || it.rate < 0 || it.rate > 100000000) return `item ${n}: invalid rate`;
    if (!isNum(it.makingPct) || it.makingPct < 0 || it.makingPct > 100) return `item ${n}: making % must be 0-100`;
  }
  if (body.received !== undefined && (!isNum(body.received) || body.received < 0 || body.received > 1e10))
    return "invalid amount received";
  return null;
}

function send(res, code, type, data) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(data);
}
const sendJSON = (res, code, obj) => send(res, code, "application/json", JSON.stringify(obj));

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/api/calculate") {
    if (req.method !== "POST") return sendJSON(res, 405, { error: "Use POST" });
    let raw = "";
    let tooBig = false;
    req.on("data", (c) => {
      raw += c;
      if (raw.length > MAX_BODY) { tooBig = true; req.destroy(); }
    });
    req.on("end", () => {
      if (tooBig) return;
      let body;
      try { body = JSON.parse(raw); } catch { return sendJSON(res, 400, { error: "Invalid JSON" }); }
      const err = validate(body);
      if (err) return sendJSON(res, 400, { error: err });

      const items = body.items.map((it) => calcItem(it.weight, it.rate, it.makingPct));
      sendJSON(res, 200, { items, bill: calcBill(items, body.received || 0) });
    });
    return;
  }

  const file = STATIC[url];
  if (file && req.method === "GET") {
    return fs.readFile(path.join(__dirname, file[0]), (e, data) =>
      e ? send(res, 500, "text/plain", "Could not read file") : send(res, 200, file[1], data));
  }
  send(res, 404, "text/plain", "Not found");
});

server.listen(PORT, () => console.log(`Pappu Jewellers billing running at http://localhost:${PORT}`));
module.exports = server;
