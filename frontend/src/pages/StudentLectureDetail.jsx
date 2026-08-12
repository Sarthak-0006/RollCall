import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import QRScanner from "../components/QRScanner";
import StatusBadge from "../components/StatusBadge";

const StudentLectureDetail = () => {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");

  const loadData = useCallback(async () => {
    const [lectureRes, attendanceRes] = await Promise.all([
      api.get(`/lectures/${id}`),
      api.get(`/attendance/lecture/${id}`),
    ]);
    setLecture(lectureRes.data.lecture);
    setAttendance(attendanceRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScan = async (token) => {
    setScanning(true);
    setScanMessage("");
    setScanError("");
    try {
      const { data } = await api.post("/attendance/scan", { token });
      setScanMessage(`Checked in for "${data.lectureTitle}" ✓`);
      loadData();
    } catch (err) {
      setScanError(err.response?.data?.message || "Could not mark attendance");
    } finally {
      setScanning(false);
    }
  };

  if (loading || !lecture || !attendance) {
    return <p className="text-ink-muted text-sm">Loading…</p>;
  }

  const percentColor =
    attendance.percentage >= 75
      ? "text-present"
      : attendance.percentage >= 50
      ? "text-brass"
      : "text-absent";

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow mb-1">{lecture.subject || "Lecture"}</p>
        <h1 className="text-3xl font-display font-semibold mb-1">{lecture.title}</h1>
        {lecture.teacher?.name && (
          <p className="text-sm text-ink-muted">Taught by {lecture.teacher.name}</p>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr,1.4fr] gap-6">
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <p className="eyebrow mb-3">Your attendance</p>
            <p className={`font-mono text-5xl font-semibold ${percentColor}`}>
              {attendance.percentage}%
            </p>
            <p className="text-sm text-ink-muted mt-2">
              {attendance.presentCount} of {attendance.totalSessions} session(s) attended
            </p>
          </div>

          <QRScanner onScan={handleScan} disabled={scanning} />
          {scanMessage && (
            <p className="text-sm text-present font-medium text-center">{scanMessage}</p>
          )}
          {scanError && <p className="text-sm text-absent font-medium text-center">{scanError}</p>}
        </div>

        <div className="card p-5">
          <p className="eyebrow mb-3">Session history</p>
          {attendance.history.length === 0 ? (
            <p className="text-sm text-ink-muted">No sessions have been held yet.</p>
          ) : (
            <div>
              {attendance.history.map((h) => (
                <div key={h.session._id} className="ledger-row">
                  <div>
                    <p className="text-sm font-medium">
                      {h.session.topic || new Date(h.session.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {new Date(h.session.date).toLocaleString()}
                      {h.method && ` · via ${h.method === "qr" ? "QR scan" : "manual"}`}
                    </p>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentLectureDetail;
