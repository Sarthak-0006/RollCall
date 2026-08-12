const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Lecture = require("../models/Lecture");
const Session = require("../models/Session");

const generateJoinCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

// @desc    Create a new lecture (course)
// @route   POST /api/lectures
// @access  Private/Teacher
const createLecture = asyncHandler(async (req, res) => {
  const { title, subject, description } = req.body;

  if (!title) {
    res.status(400);
    throw new Error("Lecture title is required");
  }

  // Keep generating a join code until we find one that isn't taken
  let joinCode;
  let isUnique = false;
  while (!isUnique) {
    joinCode = generateJoinCode();
    const existing = await Lecture.findOne({ joinCode });
    if (!existing) isUnique = true;
  }

  const lecture = await Lecture.create({
    title,
    subject,
    description,
    teacher: req.user._id,
    joinCode,
  });

  res.status(201).json(lecture);
});

// @desc    Get lectures relevant to the logged in user
//          Teacher -> lectures they created. Student -> lectures they joined.
// @route   GET /api/lectures/my
// @access  Private
const getMyLectures = asyncHandler(async (req, res) => {
  let lectures;

  if (req.user.role === "teacher") {
    lectures = await Lecture.find({ teacher: req.user._id }).sort({ createdAt: -1 });
  } else {
    lectures = await Lecture.find({ students: req.user._id }).sort({ createdAt: -1 });
  }

  res.json(lectures);
});

// @desc    Browse all lectures available to join (students discover lectures here)
// @route   GET /api/lectures
// @access  Private/Student
const getAllLectures = asyncHandler(async (req, res) => {
  const lectures = await Lecture.find()
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });

  const withJoinStatus = lectures.map((lecture) => ({
    _id: lecture._id,
    title: lecture.title,
    subject: lecture.subject,
    description: lecture.description,
    teacher: lecture.teacher,
    studentCount: lecture.students.length,
    joined: lecture.students.some((id) => id.toString() === req.user._id.toString()),
    createdAt: lecture.createdAt,
  }));

  res.json(withJoinStatus);
});

// @desc    Join a lecture, either by its join code or directly by id (from the browse list)
// @route   POST /api/lectures/join
// @access  Private/Student
const joinLecture = asyncHandler(async (req, res) => {
  const { joinCode, lectureId } = req.body;

  if (!joinCode && !lectureId) {
    res.status(400);
    throw new Error("A join code or lecture id is required");
  }

  const lecture = lectureId
    ? await Lecture.findById(lectureId)
    : await Lecture.findOne({ joinCode: joinCode.toUpperCase().trim() });

  if (!lecture) {
    res.status(404);
    throw new Error("No matching lecture found");
  }

  if (lecture.students.some((id) => id.toString() === req.user._id.toString())) {
    res.status(400);
    throw new Error("You have already joined this lecture");
  }

  lecture.students.push(req.user._id);
  await lecture.save();

  res.json(lecture);
});

// @desc    Get full details of a single lecture (teacher owner or enrolled student only)
// @route   GET /api/lectures/:id
// @access  Private
const getLectureById = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id)
    .populate("teacher", "name email")
    .populate("students", "name email identifier");

  if (!lecture) {
    res.status(404);
    throw new Error("Lecture not found");
  }

  const isOwner = lecture.teacher._id.toString() === req.user._id.toString();
  const isMember = lecture.students.some((s) => s._id.toString() === req.user._id.toString());

  if (req.user.role === "teacher" && !isOwner) {
    res.status(403);
    throw new Error("Only the lecture's teacher can view this");
  }
  if (req.user.role === "student" && !isMember) {
    res.status(403);
    throw new Error("Join this lecture before viewing its details");
  }

  const sessions = await Session.find({ lecture: lecture._id }).sort({ date: -1 });

  // Never expose the raw qrToken here - it must only be obtained by actually scanning
  // the code (or via the teacher-only QR endpoints), otherwise attendance could be
  // faked by reading it straight out of the API response.
  const sanitizedSessions = sessions.map((s) => ({
    _id: s._id,
    lecture: s.lecture,
    teacher: s.teacher,
    topic: s.topic,
    date: s.date,
    status: s.status,
    hasActiveQr: Boolean(s.qrToken && s.qrExpiresAt && s.qrExpiresAt > new Date()),
  }));

  res.json({ lecture, sessions: sanitizedSessions });
});

module.exports = { createLecture, getMyLectures, getAllLectures, joinLecture, getLectureById };
