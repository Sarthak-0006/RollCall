const crypto = require("crypto");

// Generates a hard-to-guess token to embed in the QR code. Kept short enough
// that a teacher can read it aloud as a manual fallback if a student's camera
// isn't working, while still being infeasible to guess within its short
// validity window.
const generateQrToken = () => crypto.randomBytes(6).toString("hex").toUpperCase();

module.exports = generateQrToken;
