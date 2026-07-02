export function ScanButton({
  scanning,
  scanPct,
  onClick,
}: {
  scanning: boolean;
  scanPct: number;
  onClick: () => void;
}) {
  return (
    <button className={`btn btn-primary${scanning ? " btn-primary--busy" : ""}`} disabled={scanning} onClick={onClick}>
      {scanning ? (
        <>
          <span className="spinner" />
          <span>Escaneando… {scanPct}%</span>
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="#170B03" strokeWidth="1.6" />
            <path d="M8 8 L12 4.5" stroke="#170B03" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="8" cy="8" r="1.6" fill="#170B03" />
          </svg>
          <span>Escanear repo</span>
        </>
      )}
    </button>
  );
}
