const asyncHandler = require("express-async-handler");
const Session = require("../models/Session");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");

// @desc    Student scans a teacher's QR code to mark themselves present
// @route   POST /api/attendance/scan
// @access  Private/Student
const scanQrAttendance = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error("QR token is required");
  }

  const session = await Session.findOne({ qrToken: token });

  if (!session) {
    res.status(404);
    throw new Error("This QR code is invalid. Ask your teacher to show a new one.");
  }

  if (session.status === "closed") {
    res.status(400);
    throw new Error("Roll call for this session is closed");
  }

  if (!session.qrExpiresAt || session.qrExpiresAt < new Date()) {
    res.status(400);
    throw new Error("This QR code has expired. Ask your teacher to generate a new one.");
  }

  const lecture = await Lecture.findById(session.lecture);
  const isMember = lecture.students.some((id) => id.toString() === req.user._id.toString());
  if (!isMember) {
    res.status(403);
    throw new Error("You must join this lecture before marking attendance");
  }

  const existing = await Attendance.findOne({ session: session._id, student: req.user._id });
  if (existing && existing.status === "present") {
    res.status(400);
    throw new Error("Attendance already marked for this session");
  }

  const record = await Attendance.findOneAndUpdate(
    { session: session._id, student: req.user._id },
    {
      session: session._id,
      lecture: lecture._id,
      student: req.user._id,
      status: "present",
      method: "qr",
      markedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ message: "Attendance marked successfully", record, lectureTitle: lecture.title });
});

// @desc    Get the logged-in student's attendance summary across all their lectures
// @route   GET /api/attendance/my-summary
// @access  Private/Student
const getMyAttendanceSummary = asyncHandler(async (req, res) => {
  const lectures = await Lecture.find({ students: req.user._id });

  const summary = await Promise.all(
    lectures.map(async (lecture) => {
      const totalSessions = await Session.countDocuments({ lecture: lecture._id });
      const presentCount = await Attendance.countDocuments({
        lecture: lecture._id,
        student: req.user._id,
        status: "present",
      });

      return {
        lecture: { _id: lecture._id, title: lecture.title, subject: lecture.subject },
        totalSessions,
        presentCount,
        percentage: totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 1000) / 10,
      };
    })
  );

  res.json(summary);
});

// @desc    Get the logged-in student's detailed attendance for one lecture
// @route   GET /api/attendance/lecture/:lectureId
// @access  Private/Student
const getMyLectureAttendance = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    res.status(404);
    throw new Error("Lecture not found");
  }
  const isMember = lecture.students.some((id) => id.toString() === req.user._id.toString());
  if (!isMember) {
    res.status(403);
    throw new Error("You have not joined this lecture");
  }

  const sessions = await Session.find({ lecture: lectureId }).sort({ date: -1 });
  const records = await Attendance.find({ lecture: lectureId, student: req.user._id });

  const history = sessions.map((session) => {
    const record = records.find((r) => r.session.toString() === session._id.toString());
    return {
      session: { _id: session._id, topic: session.topic, date: session.date, status: session.status },
      status: record ? record.status : "absent",
      method: record ? record.method : null,
    };
  });

  const presentCount = history.filter((h) => h.status === "present").length;
  const totalSessions = sessions.length;

  res.json({
    lecture: { _id: lecture._id, title: lecture.title, subject: lecture.subject },
    totalSessions,
    presentCount,
    percentage: totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 1000) / 10,
    history,
  });
});

// @desc    Teacher: get every enrolled student's attendance stats for one lecture
// @route   GET /api/attendance/lecture/:lectureId/report
// @access  Private/Teacher
const getLectureReport = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId).populate("students", "name email identifier");
  if (!lecture) {
    res.status(404);
    throw new Error("Lecture not found");
  }
  if (lecture.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the lecture's teacher can view this report");
  }

  const totalSessions = await Session.countDocuments({ lecture: lectureId });

  const report = await Promise.all(
    lecture.students.map(async (student) => {
      const presentCount = await Attendance.countDocuments({
        lecture: lectureId,
        student: student._id,
        status: "present",
      });
      return {
        student,
        totalSessions,
        presentCount,
        percentage: totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 1000) / 10,
      };
    })
  );

  res.json({ lecture: { _id: lecture._id, title: lecture.title }, totalSessions, report });
});

module.exports = {
  scanQrAttendance,
  getMyAttendanceSummary,
  getMyLectureAttendance,
  getLectureReport,
};
