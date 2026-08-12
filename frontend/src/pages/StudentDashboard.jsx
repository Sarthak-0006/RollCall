import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const StudentDashboard = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinMessage, setJoinMessage] = useState("");

  const [browsing, setBrowsing] = useState(false);
  const [allLectures, setAllLectures] = useState([]);

  const loadSummary = async () => {
    setLoading(true);
    const { data } = await api.get("/attendance/my-summary");
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError("");
    setJoinMessage("");
    setJoining(true);
    try {
      const { data } = await api.post("/lectures/join", { joinCode });
      setJoinMessage(`Joined "${data.title}"`);
      setJoinCode("");
      loadSummary();
      if (browsing) loadAllLectures();
    } catch (err) {
      setJoinError(err.response?.data?.message || "Could not join lecture");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinById = async (lectureId) => {
    setJoinError("");
    setJoinMessage("");
    try {
      const { data } = await api.post("/lectures/join", { lectureId });
      setJoinMessage(`Joined "${data.title}"`);
      loadSummary();
      loadAllLectures();
    } catch (err) {
      setJoinError(err.response?.data?.message || "Could not join lecture");
    }
  };

  const loadAllLectures = async () => {
    const { data } = await api.get("/lectures");
    setAllLectures(data);
  };

  const toggleBrowse = () => {
    setBrowsing((b) => !b);
    if (!browsing) loadAllLectures();
  };

  const percentColor = (pct) => (pct >= 75 ? "text-present" : pct >= 50 ? "text-brass" : "text-absent");

  return (
    <div>
      <p className="eyebrow mb-1">Student dashboard</p>
      <h1 className="text-3xl font-display font-semibold mb-6">Your lectures</h1>

      <div className="card p-5 mb-6">
        <p className="label mb-2">Join a lecture with a code</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="input font-mono uppercase"
            placeholder="e.g. 4F2A9C"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" disabled={joining} className="btn-brass shrink-0">
            {joining ? "Joining…" : "Join"}
          </button>
        </form>
        {joinError && <p className="text-sm text-absent mt-2">{joinError}</p>}
        {joinMessage && <p className="text-sm text-present mt-2">{joinMessage}</p>}

        <button onClick={toggleBrowse} className="text-xs text-brass hover:underline mt-3">
          {browsing ? "Hide lecture list" : "Or browse all available lectures"}
        </button>

        {browsing && (
          <div className="mt-4 pt-4 border-t border-line space-y-2">
            {allLectures.length === 0 ? (
              <p className="text-sm text-ink-muted">No lectures have been created yet.</p>
            ) : (
              allLectures.map((l) => (
                <div key={l._id} className="ledger-row">
                  <div>
                    <p className="text-sm font-medium">{l.title}</p>
                    <p className="text-xs text-ink-muted">
                      {l.subject ? `${l.subject} · ` : ""}
                      {l.teacher?.name}
                    </p>
                  </div>
                  {l.joined ? (
                    <span className="text-xs text-present font-medium">Joined</span>
                  ) : (
                    <button onClick={() => handleJoinById(l._id)} className="btn-outline text-xs py-1">
                      Join
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : summary.length === 0 ? (
        <div className="card p-8 text-center text-ink-muted">
          <p className="mb-1 font-medium text-ink">You haven't joined any lectures yet</p>
          <p className="text-sm">Use a join code from your teacher to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {summary.map((s) => (
            <Link
              key={s.lecture._id}
              to={`/student/lectures/${s.lecture._id}`}
              className="card p-5 hover:border-brass/60 transition-colors"
            >
              <h3 className="font-display text-lg font-semibold mb-1">{s.lecture.title}</h3>
              {s.lecture.subject && <p className="text-sm text-ink-muted mb-3">{s.lecture.subject}</p>}
              <div className="flex items-center justify-between text-sm mt-4 pt-3 border-t border-line">
                <span className="text-ink-muted font-mono text-xs">
                  {s.presentCount}/{s.totalSessions} sessions
                </span>
                <span className={`font-mono font-semibold ${percentColor(s.percentage)}`}>
                  {s.percentage}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
