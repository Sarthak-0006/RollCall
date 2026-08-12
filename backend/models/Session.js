const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional label, e.g. "Lecture 12 - Binary Trees"
    topic: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Whether the teacher has closed roll call for this session
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    // Active QR token for self check-in, cleared/replaced when expired or regenerated
    qrToken: {
      type: String,
      default: null,
    },
    qrExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
