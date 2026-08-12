import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const QRDisplay = ({ sessionId }) => {
  const [qr, setQr] = useState(null); // { token, expiresAt, qrImageDataUrl }
  const [duration, setDuration] = useState(5);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const totalSecondsRef = useRef(1);

  // Restore any active QR on mount (e.g. after a page refresh)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/qr`);
        if (data.active) {
          setQr(data);
          totalSecondsRef.current = Math.max(
            1,
            Math.round((new Date(data.expiresAt) - Date.now()) / 1000)
          );
        }
      } catch {
        // no active QR yet, that's fine
      }
    };
    fetchStatus();
  }, [sessionId]);

  // Tick the countdown every second
  useEffect(() => {
    if (!qr) return;
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((new Date(qr.expiresAt) - Date.now()) / 1000));
      setRemaining(secondsLeft);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [qr]);

  const generateQr = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/sessions/${sessionId}/qr`, { durationMinutes: duration });
      setQr(data);
      totalSecondsRef.current = duration * 60;
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = qr && remaining <= 0;
  const progress = qr ? Math.max(0, remaining / totalSecondsRef.current) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">Self check-in</p>

      {!qr || isExpired ? (
        <div className="text-center py-6">
          {isExpired && (
            <p className="text-sm text-absent font-medium mb-3">
              QR code expired — no more scans are being accepted.
            </p>
          )}
          <label className="label justify-center inline-block">Valid for</label>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[2, 5, 10, 15].map((m) => (
              <button
                key={m}
                onClick={() => setDuration(m)}
                className={`px-3 py-1.5 rounded-card text-sm font-mono border ${
                  duration === m
                    ? "bg-ink text-paper border-ink"
                    : "border-line text-ink-muted hover:border-ink/40"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <button onClick={generateQr} disabled={loading} className="btn-brass">
            {loading ? "Generating…" : isExpired ? "Generate new QR code" : "Generate QR code"}
          </button>
          {error && <p className="text-sm text-absent mt-3">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col items-center py-2">
          <div className="relative border-2 border-dashed border-brass/60 rounded-card p-4 bg-white">
            <img src={qr.qrImageDataUrl} alt="Attendance QR code" className="w-56 h-56" />
          </div>
          <p className="text-xs text-ink-muted mt-3">
            Camera trouble? Students can type this code instead:
          </p>
          <p className="font-mono text-lg tracking-[0.2em] text-ink mt-1">{qr.token}</p>

          <div className="flex items-center gap-3 mt-5">
            <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
              <circle cx="30" cy="30" r={RADIUS} stroke="#D7DBD1" strokeWidth="5" fill="none" />
              <circle
                cx="30"
                cy="30"
                r={RADIUS}
                stroke="#B8862B"
                strokeWidth="5"
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div>
              <p className="font-mono text-2xl text-ink leading-none">
                {minutes}:{seconds}
              </p>
              <p className="text-xs text-ink-muted mt-1">time remaining</p>
            </div>
          </div>

          <button onClick={generateQr} disabled={loading} className="btn-outline text-sm mt-5">
            Regenerate code
          </button>
        </div>
      )}
    </div>
  );
};

export default QRDisplay;
