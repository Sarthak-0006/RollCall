const asyncHandler = require("express-async-handler");
const QRCode = require("qrcode");
const Session = require("../models/Session");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");
const generateQrToken = require("../utils/generateQrToken");

// Small helper to confirm the requesting teacher owns the lecture behind a session
const assertOwnsSession = async (session, userId) => {
  const lecture = await Lecture.findById(session.lecture);
  if (!lecture || lecture.teacher.toString() !== userId.toString()) {
    const err = new Error("You do not have access to this session");
    err.statusCode = 403;
    throw err;
  }
  return lecture;
};

// @desc    Start a new class session under a lecture
// @route   POST /api/lectures/:lectureId/sessions
// @access  Private/Teacher
const createSession = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.lectureId);

  if (!lecture) {
    res.status(404);
    throw new Error("Lecture not found");
  }
  if (lecture.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the lecture's teacher can start a session");
  }

  const session = await Session.create({
    lecture: lecture._id,
    teacher: req.user._id,
    topic: req.body.topic || "",
  });

  res.status(201).json(session);
});

// @desc    Get a session with the full class roster and current attendance status
// @route   GET /api/sessions/:id
// @access  Private/Teacher
const getSessionRoster = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  const lecture = await assertOwnsSession(session, req.user._id);

  const populatedLecture = await Lecture.findById(lecture._id).populate(
    "students",
    "name email identifier"
  );
  const attendanceRecords = await Attendance.find({ session: session._id });

  const roster = populatedLecture.students.map((student) => {
    const record = attendanceRecords.find((a) => a.student.toString() === student._id.toString());
    return {
      student,
      status: record ? record.status : "unmarked",
      method: record ? record.method : null,
    };
  });

  res.json({ session, roster });
});

// @desc    Generate (or regenerate) a time-limited QR code for self check-in
// @route   POST /api/sessions/:id/qr
// @access  Private/Teacher
const generateSessionQr = asyncHandler(async (req, res) => {
  const { durationMinutes = 5 } = req.body;

  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  await assertOwnsSession(session, req.user._id);

  if (session.status === "closed") {
    res.status(400);
    throw new Error("This session's roll call is closed");
  }

  const token = generateQrToken();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  session.qrToken = token;
  session.qrExpiresAt = expiresAt;
  await session.save();

  // Encode just the token - the student app reads this and posts it to /api/attendance/scan
  const qrImageDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 320 });

  res.json({ token, expiresAt, qrImageDataUrl });
});

// @desc    Get the current QR status for a session (for teacher's screen to poll on refresh)
// @route   GET /api/sessions/:id/qr
// @access  Private/Teacher
const getSessionQrStatus = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  await assertOwnsSession(session, req.user._id);

  if (!session.qrToken || !session.qrExpiresAt || session.qrExpiresAt < new Date()) {
    return res.json({ active: false });
  }

  const qrImageDataUrl = await QRCode.toDataURL(session.qrToken, { margin: 1, width: 320 });
  res.json({ active: true, token: session.qrToken, expiresAt: session.qrExpiresAt, qrImageDataUrl });
});

// @desc    Mark attendance manually for one or more students
// @route   POST /api/sessions/:id/manual
// @access  Private/Teacher
const markManualAttendance = asyncHandler(async (req, res) => {
  const { records } = req.body; // [{ studentId, status }]

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400);
    throw new Error("Provide an array of records: [{ studentId, status }]");
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  const lecture = await assertOwnsSession(session, req.user._id);

  const validStudentIds = new Set(lecture.students.map((id) => id.toString()));

  const results = [];
  for (const { studentId, status } of records) {
    if (!validStudentIds.has(studentId)) continue; // skip students not enrolled
    if (!["present", "absent"].includes(status)) continue;

    const record = await Attendance.findOneAndUpdate(
      { session: session._id, student: studentId },
      {
        session: session._id,
        lecture: lecture._id,
        student: studentId,
        status,
        method: "manual",
        markedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push(record);
  }

  res.json({ updated: results.length, records: results });
});

// @desc    Close roll call for a session (also invalidates any active QR code)
// @route   POST /api/sessions/:id/close
// @access  Private/Teacher
const closeSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  await assertOwnsSession(session, req.user._id);

  session.status = "closed";
  session.qrToken = null;
  session.qrExpiresAt = null;
  await session.save();

  res.json(session);
});

module.exports = {
  createSession,
  getSessionRoster,
  generateSessionQr,
  getSessionQrStatus,
  markManualAttendance,
  closeSession,
};
