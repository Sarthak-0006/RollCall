import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCAN_REGION_ID = "rollcall-qr-scan-region";

const QRScanner = ({ onScan, disabled }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const scannerRef = useRef(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // scanner may already be stopped
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setCameraError("");
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // fires continuously while no code is found in frame - safe to ignore
        }
      );
    } catch (err) {
      setCameraError(
        "Could not access the camera. Check permissions, or enter the code shown by your teacher below."
      );
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      onScan(manualToken.trim());
      setManualToken("");
    }
  };

  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">Scan to check in</p>

      {!scanning && (
        <button onClick={startScanner} disabled={disabled} className="btn-brass w-full">
          Open camera scanner
        </button>
      )}

      <div
        id={SCAN_REGION_ID}
        className={`mt-3 rounded-card overflow-hidden ${scanning ? "block" : "hidden"}`}
      />

      {scanning && (
        <button onClick={stopScanner} className="btn-outline w-full mt-3 text-sm">
          Cancel scan
        </button>
      )}

      {cameraError && <p className="text-sm text-absent mt-3">{cameraError}</p>}

      <div className="mt-5 pt-4 border-t border-line">
        <p className="text-xs text-ink-muted mb-2">
          No camera? Ask your teacher to read out the code, or paste it here.
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste check-in code"
            className="input font-mono text-xs"
          />
          <button type="submit" disabled={disabled} className="btn-outline text-sm shrink-0">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
