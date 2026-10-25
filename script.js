/* =====================================================================
   script.js - UI + PDF.  Maths is in calc.js / server.js
   ===================================================================== */

const $ = (id) => document.getElementById(id);

/* Images used on the PDF. To change the header or the UPI QR, just replace these
   two files in the project folder (keep the same file names). */
const HEADER_FILE = "heade.png";
const UPI_FILE = "upi.png";

/* Load an image file -> { data: PNG dataURL, w, h } (natural size, so we can keep proportions) */
function loadImageFile(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve({ data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      } catch (e) {
        reject(new Error(`Browser blocked reading "${src}". Start the app with "node server.js" and open http://localhost:3000`));
      }
    };
    img.onerror = () => reject(new Error(`Could not load "${src}". Make sure the file is in the same folder as index.html.`));
    img.src = src;
  });
}

const state = {
  items: [],                 // what the owner typed: { desc, weight, rate, makingPct }
  calc: emptyCalc(),         // what the BACKEND returned (money in paise)
  photos: [null, null]       // { data: jpeg dataURL, w, h }
};

function emptyCalc() { return { items: [], bill: calcBill([], 0) }; }

/* ----------------------- backend call (all maths is server-side) -----------------------
   POST /api/calculate  ->  { items:[{amount,making,total}], bill:{...} }
   If the page is opened without the server (double-click / file://), it falls back to the
   same maths in calc.js so billing still works, and a small notice says so.              */
async function calculate(items, received) {
  const payload = {
    items: items.map((i) => ({ weight: i.weight, rate: i.rate, makingPct: i.makingPct })),
    received,
  };
  if (location.protocol !== "file:") {
    let res;
    try {
      res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) { res = null; }                       // server not reachable -> fallback below
    if (res) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Server error");
      setMode(true);
      return data;
    }
  }
  setMode(false);
  const calcItems = items.map((i) => calcItem(i.weight, i.rate, i.makingPct));
  return { items: calcItems, bill: calcBill(calcItems, received) };
}

function setMode(server) {
  const el = $("mode");
  el.textContent = server ? "\u25CF Calculated on server" : "\u25CF Offline mode - calculated in browser (run: node server.js)";
  el.className = server ? "" : "offline";
}

let refreshSeq = 0;
async function refresh() {
  const mine = ++refreshSeq;                           // ignore out-of-order replies
  try {
    const r = await calculate(state.items, num("received"));
    if (mine !== refreshSeq) return;
    state.calc = r;
    render();
  } catch (err) { alert("Calculation failed: " + err.message); }
}

/* ------------------------------ helpers ------------------------------ */
const num = (id) => {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) ? v : 0;
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {            // 2026-10-25 -> 25-10-2026
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function cell(text, cls) {
  const td = document.createElement("td");
  td.textContent = text;            // textContent => customer text can never inject HTML
  if (cls) td.className = cls;
  return td;
}

/* --------------------------- live item preview --------------------------- */
let previewSeq = 0;
async function updateItemPreview() {
  const mine = ++previewSeq;
  const one = [{ weight: num("weight"), rate: num("rate"), makingPct: num("makingPct") }];
  try {
    const r = (await calculate(one, 0)).items[0];
    if (mine !== previewSeq) return;
    $("pvAmount").textContent = fmt(r.amount);
    $("pvMaking").textContent = fmt(r.making);
    $("pvTotal").textContent = fmt(r.total);
  } catch (e) { /* half-typed values: ignore */ }
}

/* ------------------------------ add / remove ------------------------------ */
async function addItem() {
  const desc = $("desc").value.trim();
  const weight = num("weight");
  const rate = num("rate");
  const makingPct = num("makingPct");

  if (!desc) return alert("Please enter item description."), $("desc").focus();
  if (weight <= 0) return alert("Weight must be greater than 0."), $("weight").focus();
  if (rate <= 0) return alert("Rate must be greater than 0."), $("rate").focus();
  if (makingPct < 0 || makingPct > 100) return alert("Making charges must be between 0 and 100 %."), $("makingPct").focus();

  state.items.push({ desc, weight, rate, makingPct });

  ["desc", "weight", "rate", "makingPct"].forEach((id) => ($(id).value = ""));
  updateItemPreview();
  await refresh();
  $("desc").focus();
}

function removeItem(i) {
  state.items.splice(i, 1);
  refresh();
}

/* --------------------------------- render --------------------------------- */
function render() {
  const body = $("billBody");
  body.replaceChildren();

  const { items: calcRows, bill: b } = state.calc;

  state.items.forEach((it, i) => {
    const r = calcRows[i];
    if (!r) return;
    const tr = document.createElement("tr");
    tr.append(
      cell(i + 1),
      cell(it.desc, "l"),
      cell(it.weight),
      cell(it.rate.toLocaleString("en-IN")),
      cell(it.makingPct + "%"),
      cell(fmt(r.total))
    );
    const td = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "del";
    btn.type = "button";
    btn.title = "Remove item";
    btn.textContent = "\u00D7";
    btn.onclick = () => removeItem(i);
    td.append(btn);
    tr.append(td);
    body.append(tr);
  });

  $("emptyMsg").style.display = state.items.length ? "none" : "block";

  $("sTaxable").textContent = fmt(b.taxable);
  $("sCgst").textContent = fmt(b.cgst);
  $("sSgst").textContent = fmt(b.sgst);
  $("sRound").textContent = fmtSigned(b.roundOff);
  $("sGrand").textContent = fmt(b.grand);
  $("sReceived").textContent = fmt(b.received);

  const due = $("sDue").parentElement;
  if (b.remaining < 0) {
    $("sDueLabel").textContent = "Excess Received (Return to customer)";
    $("sDue").textContent = fmt(-b.remaining);
  } else {
    $("sDueLabel").textContent = "Remaining Amount";
    $("sDue").textContent = fmt(b.remaining);
  }
  due.classList.toggle("paid", b.remaining <= 0 && b.grand > 0);
}

/* ------------------------------ item photos ------------------------------ */
/* Re-encode every upload to a JPEG (max 1000px): jsPDF can't read WebP/HEIC,
   and phone photos are huge. This keeps the PDF small and always valid. */
function loadPhoto(inputId, slot) {
  $(inputId).addEventListener("change", (e) => {
    const file = e.target.files[0];
    state.photos[slot] = null;
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      state.photos[slot] = { data: c.toDataURL("image/jpeg", 0.85), w, h };
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { alert("Could not read this image."); e.target.value = ""; };
    img.src = url;
  });
}

/* --------------------------------- PDF --------------------------------- */
async function generatePDF() {
  if (state.items.length === 0) return alert("No items added.");
  if (!window.jspdf || !window.jspdf.jsPDF) {
    return alert("PDF library could not load. Please check your internet connection and refresh.");
  }
  if (!window.jspdf.jsPDF.API.autoTable) {
    return alert("PDF table plugin could not load. Please check your internet connection and refresh.");
  }

  const btn = $("pdfBtn");
  btn.disabled = true;
  try {
    const result = await calculate(state.items, num("received"));  // backend figures
    state.calc = result;
    render();
    const images = { header: await loadImageFile(HEADER_FILE), upi: await loadImageFile(UPI_FILE) };
    buildPDF(result, images);
  } catch (err) {
    console.error(err);
    alert("Could not create PDF: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

function buildPDF(result, images) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210, PAGE_H = 297, M = 14, BOTTOM = PAGE_H - 12;
  const b = result.bill;

  const ensureSpace = (y, needed) => {
    if (y + needed > BOTTOM) { doc.addPage(); return 15; }
    return y;
  };

  /* ---- header (keeps the real aspect ratio of the banner) ---- */
  const hw = 190;
  const hh = hw * (images.header.h / images.header.w);
  doc.addImage(images.header.data, "PNG", (PAGE_W - hw) / 2, 5, hw, hh);

  let y = 5 + hh + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TAX INVOICE", PAGE_W / 2, y, { align: "center" });
  y += 8;

  /* ---- customer ---- */
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");   doc.text("Name :", M, y);
  doc.setFont("helvetica", "normal"); doc.text($("custName").value.trim(), M + 14, y);

  doc.setFont("helvetica", "bold");   doc.text("Date :", 140, y);
  doc.setFont("helvetica", "normal"); doc.text(fmtDate($("billDate").value), 152, y);
  y += 7;

  doc.setFont("helvetica", "bold");   doc.text("Add :", M, y);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize($("custAddress").value.trim(), 105);
  doc.text(addrLines, M + 14, y);

  doc.setFont("helvetica", "bold");   doc.text("Mobile :", 140, y);
  doc.setFont("helvetica", "normal"); doc.text($("custMobile").value.trim(), 156, y);
  y += Math.max(1, addrLines.length) * 5 + 4;

  /* ---- items table ---- */
  const rows = state.items.map((it, i) => [
    i + 1, it.desc, it.weight.toFixed(3), it.rate.toLocaleString("en-IN"),
    it.makingPct + "%", fmt(result.items[i].total),
  ]);

  doc.autoTable({
    startY: y,
    head: [["#", "Description", "Weight (g)", "Rate", "Making %", "Total"]],
    body: rows,
    margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [20, 20, 20], textColor: 255, halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: "auto" },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  /* ---- tax / totals summary (right aligned) ---- */
  const excess = b.remaining < 0;
  const summary = [
    ["Total Amount", fmt(b.taxable)],
    ["CGST (1.5%)", fmt(b.cgst)],
    ["SGST (1.5%)", fmt(b.sgst)],
    ["Round Off", fmtSigned(b.roundOff)],
    ["Grand Total", fmt(b.grand)],
    ["Amount Received", fmt(b.received)],
    [excess ? "Excess Received" : "Remaining Amount", fmt(Math.abs(b.remaining))],
  ];
  const BOLD_ROWS = [0, 4, 6];

  y = ensureSpace(y, summary.length * 7 + 4);
  doc.autoTable({
    startY: y,
    body: summary,
    theme: "grid",
    margin: { left: 110, right: M },
    styles: { fontSize: 10, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 46 }, 1: { halign: "right" } },
    didParseCell: (d) => {
      if (BOLD_ROWS.includes(d.row.index)) d.cell.styles.fontStyle = "bold";
      if (d.row.index === 4) d.cell.styles.fillColor = [251, 245, 225];
      if (d.row.index === 6 && !excess && b.remaining > 0) d.cell.styles.textColor = [179, 38, 30];
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  /* ---- grand total in words ---- */
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const words = "Grand Total (in words): Rupees " + numberToWords(b.grand / 100) + " Only";
  const wLines = doc.splitTextToSize(words, PAGE_W - 2 * M);
  y = ensureSpace(y, wLines.length * 5 + 4);
  doc.text(wLines, M, y);
  y += wLines.length * 5 + 6;

  /* ---- item photos (fit inside a 85 x 60 box, no stretching) ---- */
  const shots = state.photos.filter(Boolean);
  if (shots.length) {
    y = ensureSpace(y, 66);
    state.photos.forEach((p, slot) => {
      if (!p) return;
      const boxW = 85, boxH = 60;
      const s = Math.min(boxW / p.w, boxH / p.h);
      const w = p.w * s, h = p.h * s;
      const x = slot === 0 ? M : 110;
      doc.addImage(p.data, "JPEG", x, y, w, h);
    });
    y += 66;
  }

  /* ---- terms (left) + UPI QR (right) ---- */
  y = ensureSpace(y, 48);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");   doc.text("Terms & Conditions:", M, y);
  doc.setFont("helvetica", "normal");
  doc.text("Goods once sold will not be taken back.", M, y + 6);
  doc.text("Subject to Hajipur jurisdiction.", M, y + 12);
  doc.text("Thank you for shopping with us!", M, y + 22);

  const qs = Math.min(40 / images.upi.w, 41 / images.upi.h);   // fit in 40 x 41 mm box
  const qw = images.upi.w * qs, qh = images.upi.h * qs;
  doc.addImage(images.upi.data, "PNG", 170 - qw / 2, y - 4, qw, qh);
  doc.setFontSize(8);
  doc.text("Scan to pay", 170, y + 40, { align: "center" });

  /* ---- save ---- */
  const safe = ($("custName").value.trim() || "Customer").replace(/[^\w\-]+/g, "_");
  doc.save(`Invoice_${safe}_${$("billDate").value || todayISO()}.pdf`);
}

/* --------------------------------- reset --------------------------------- */
function resetBill() {
  if (state.items.length && !confirm("Clear this bill and start a new one?")) return;
  state.items = [];
  state.calc = emptyCalc();
  state.photos = [null, null];
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  $("billDate").value = todayISO();
  updateItemPreview();
  refresh();
}

/* --------------------------------- init --------------------------------- */
$("billDate").value = todayISO();
$("addBtn").addEventListener("click", addItem);
$("pdfBtn").addEventListener("click", generatePDF);
$("resetBtn").addEventListener("click", resetBill);
$("received").addEventListener("input", refresh);
["weight", "rate", "makingPct"].forEach((id) => $(id).addEventListener("input", updateItemPreview));
["desc", "weight", "rate", "makingPct"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") addItem(); })
);
loadPhoto("itemImage1", 0);
loadPhoto("itemImage2", 1);
refresh();
updateItemPreview();
