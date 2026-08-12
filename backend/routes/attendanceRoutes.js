const express = require("express");
const {
  scanQrAttendance,
  getMyAttendanceSummary,
  getMyLectureAttendance,
  getLectureReport,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/scan", authorize("student"), scanQrAttendance);
router.get("/my-summary", authorize("student"), getMyAttendanceSummary);
router.get("/lecture/:lectureId", authorize("student"), getMyLectureAttendance);
router.get("/lecture/:lectureId/report", authorize("teacher"), getLectureReport);

module.exports = router;
