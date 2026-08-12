import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import QRDisplay from "../components/QRDisplay";
import StatusBadge from "../components/StatusBadge";

const TeacherLectureDetail = () => {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);

  const [selectedSession, setSelectedSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const loadLecture = useCallback(async () => {
    const { data } = await api.get(`/lectures/${id}`);
    setLecture(data.lecture);
    setSessions(data.sessions);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadLecture();
  }, [loadLecture]);

  const loadRoster = useCallback(async (sessionId) => {
    setRosterLoading(true);
    const { data } = await api.get(`/sessions/${sessionId}`);
    setSelectedSession(data.session);
    setRoster(data.roster);
    setRosterLoading(false);
  }, []);

  // Poll the roster every 4s while an open session is selected, so QR check-ins show up live
  useEffect(() => {
    if (!selectedSession || selectedSession.status !== "open") return;
    const interval = setInterval(() => loadRoster(selectedSession._id), 4000);
    return () => clearInterval(interval);
  }, [selectedSession, loadRoster]);

  const handleStartSession = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const { data } = await api.post(`/lectures/${id}/sessions`, { topic });
      setTopic("");
      await loadLecture();
      loadRoster(data._id);
    } finally {
      setStarting(false);
    }
  };

  const markStudent = async (studentId, status) => {
    setRoster((prev) =>
      prev.map((r) => (r.student._id === studentId ? { ...r, status, method: "manual" } : r))
    );
    await api.post(`/sessions/${selectedSession._id}/manual`, {
      records: [{ studentId, status }],
    });
  };

  const handleCloseSession = async () => {
    await api.post(`/sessions/${selectedSession._id}/close`);
    loadRoster(selectedSession._id);
    loadLecture();
  };

  const loadReport = async () => {
    setShowReport(true);
    const { data } = await api.get(`/attendance/lecture/${id}/report`);
    setReport(data);
  };

  if (loading || !lecture) return <p className="text-ink-muted text-sm">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow mb-1">{lecture.subject || "Lecture"}</p>
        <h1 className="text-3xl font-display font-semibold mb-2">{lecture.title}</h1>
        {lecture.description && <p className="text-sm text-ink-muted mb-3">{lecture.description}</p>}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-ink/5 rounded-full px-3 py-1">
            Join code:{" "}
            <span className="font-mono text-brass font-semibold tracking-wider">{lecture.joinCode}</span>
          </span>
          <span className="text-ink-muted">{lecture.students.length} student(s) enrolled</span>
          <button onClick={loadReport} className="btn-outline text-xs py-1">
            View attendance report
          </button>
        </div>
      </div>

      {showReport && report && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow">Attendance report · {report.totalSessions} session(s) held</p>
            <button onClick={() => setShowReport(false)} className="text-xs text-ink-muted hover:text-ink">
              Close
            </button>
          </div>
          {report.report.length === 0 ? (
            <p className="text-sm text-ink-muted">No students enrolled yet.</p>
          ) : (
            <div>
              {report.report.map((r) => (
                <div key={r.student._id} className="ledger-row">
                  <div>
                    <p className="text-sm font-medium">{r.student.name}</p>
                    <p className="text-xs text-ink-muted">{r.student.identifier || r.student.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-ink-muted font-mono">
                      {r.presentCount}/{r.totalSessions}
                    </span>
                    <span className="font-mono text-sm font-semibold text-ink w-14 text-right">
                      {r.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr,1.4fr] gap-6">
        <div>
          <form onSubmit={handleStartSession} className="card p-4 mb-4 space-y-3">
            <label className="label">Start a new session</label>
            <input
              className="input"
              placeholder="Topic (optional)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <button type="submit" disabled={starting} className="btn-brass w-full text-sm">
              {starting ? "Starting…" : "Start session"}
            </button>
          </form>

          <div className="card p-4">
            <p className="eyebrow mb-3">Past sessions</p>
            {sessions.length === 0 ? (
              <p className="text-sm text-ink-muted">No sessions yet.</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => loadRoster(s._id)}
                    className={`w-full text-left px-3 py-2 rounded-card text-sm flex items-center justify-between ${
                      selectedSession?._id === s._id ? "bg-ink text-paper" : "hover:bg-ink/5"
                    }`}
                  >
                    <span>{s.topic || new Date(s.date).toLocaleDateString()}</span>
                    <span
                      className={`text-xs font-mono ${
                        selectedSession?._id === s._id ? "text-brass-light" : "text-ink-muted"
                      }`}
                    >
                      {s.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {!selectedSession ? (
            <div className="card p-8 text-center text-ink-muted text-sm h-full flex items-center justify-center">
              Select or start a session to take attendance.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {selectedSession.topic || "Session"}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {new Date(selectedSession.date).toLocaleString()} ·{" "}
                    <span className="capitalize">{selectedSession.status}</span>
                  </p>
                </div>
                {selectedSession.status === "open" && (
                  <button onClick={handleCloseSession} className="btn-danger text-xs py-1.5">
                    Close roll call
                  </button>
                )}
              </div>

              {selectedSession.status === "open" && <QRDisplay sessionId={selectedSession._id} />}

              <div className="card p-5">
                <p className="eyebrow mb-3">Manual roster {rosterLoading && "· refreshing…"}</p>
                {roster.length === 0 ? (
                  <p className="text-sm text-ink-muted">No students enrolled in this lecture yet.</p>
                ) : (
                  <div>
                    {roster.map((r) => (
                      <div key={r.student._id} className="ledger-row">
                        <div>
                          <p className="text-sm font-medium">{r.student.name}</p>
                          <p className="text-xs text-ink-muted">{r.student.identifier || r.student.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          {selectedSession.status === "open" && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => markStudent(r.student._id, "present")}
                                className="text-xs px-2 py-1 rounded-card border border-line hover:border-present text-ink-muted hover:text-present"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => markStudent(r.student._id, "absent")}
                                className="text-xs px-2 py-1 rounded-card border border-line hover:border-absent text-ink-muted hover:text-absent"
                              >
                                Absent
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherLectureDetail;
