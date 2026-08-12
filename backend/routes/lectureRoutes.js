const express = require("express");
const {
  createLecture,
  getMyLectures,
  getAllLectures,
  joinLecture,
  getLectureById,
} = require("../controllers/lectureController");
const { createSession } = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", authorize("teacher"), createLecture);
router.get("/", authorize("student"), getAllLectures);
router.get("/my", getMyLectures);
router.post("/join", authorize("student"), joinLecture);
router.get("/:id", getLectureById);
router.post("/:lectureId/sessions", authorize("teacher"), createSession);

module.exports = router;
