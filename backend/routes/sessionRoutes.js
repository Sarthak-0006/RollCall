const express = require("express");
const {
  getSessionRoster,
  generateSessionQr,
  getSessionQrStatus,
  markManualAttendance,
  closeSession,
} = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("teacher"));

router.get("/:id", getSessionRoster);
router.post("/:id/qr", generateSessionQr);
router.get("/:id/qr", getSessionQrStatus);
router.post("/:id/manual", markManualAttendance);
router.post("/:id/close", closeSession);

module.exports = router;
