type ScanState = "idle" | "scanning" | "error";

export default function ScanButton({
  state,
  onScan,
}: {
  state: ScanState;
  onScan: () => void;
}) {
  return (
    <button
      type="button"
      className="scan-button"
      onClick={onScan}
      disabled={state === "scanning"}
    >
      {state === "scanning" ? "Escaneando..." : "Escanear repo"}
    </button>
  );
}
