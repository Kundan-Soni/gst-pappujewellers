# Pappu Jewellers - GST Billing

## Run (recommended - calculations happen on the backend)
    node server.js          # needs Node.js 16+, no npm install
    open http://localhost:3000

If you just double-click `index.html`, it still works in "offline mode"
(same maths, run in the browser).  A notice under the title shows which mode is active.

## Files
- `server.js` - backend: POST /api/calculate (validation + all maths)
- `calc.js`   - the billing maths (used by the server, and as offline fallback)
- `script.js` - UI + PDF
- `heade.png` - invoice header image (replace this file to change the header)
- `upi.png`   - UPI QR image (replace this file to change the QR)
- `test_calc.js` - `node test_calc.js`
