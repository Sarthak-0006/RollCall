import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const TeacherDashboard = () => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadLectures = async () => {
    setLoading(true);
    const { data } = await api.get("/lectures/my");
    setLectures(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLectures();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/lectures", form);
      setForm({ title: "", subject: "", description: "" });
      setShowForm(false);
      loadLectures();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create lecture");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">Teacher dashboard</p>
          <h1 className="text-3xl font-display font-semibold">Your lectures</h1>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-brass">
          {showForm ? "Cancel" : "+ New lecture"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input"
              placeholder="e.g. Data Structures & Algorithms"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              placeholder="e.g. Computer Science"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-absent">{error}</p>}
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? "Creating…" : "Create lecture"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : lectures.length === 0 ? (
        <div className="card p-8 text-center text-ink-muted">
          <p className="mb-1 font-medium text-ink">No lectures yet</p>
          <p className="text-sm">Create your first lecture to start taking attendance.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lectures.map((lecture) => (
            <Link
              key={lecture._id}
              to={`/teacher/lectures/${lecture._id}`}
              className="card p-5 hover:border-brass/60 transition-colors"
            >
              <h3 className="font-display text-lg font-semibold mb-1">{lecture.title}</h3>
              {lecture.subject && <p className="text-sm text-ink-muted mb-3">{lecture.subject}</p>}
              <div className="flex items-center justify-between text-xs mt-4 pt-3 border-t border-line">
                <span className="text-ink-muted">{lecture.students.length} student(s)</span>
                <span className="font-mono text-brass tracking-wider">{lecture.joinCode}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
