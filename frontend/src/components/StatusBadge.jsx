import React from "react";

const STYLES = {
  present: "bg-present-light text-present",
  absent: "bg-absent-light text-absent",
  unmarked: "bg-ink/5 text-ink-muted",
};

const LABELS = {
  present: "Present",
  absent: "Absent",
  unmarked: "Unmarked",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium font-mono ${
      STYLES[status] || STYLES.unmarked
    }`}
  >
    {LABELS[status] || "Unmarked"}
  </span>
);

export default StatusBadge;
