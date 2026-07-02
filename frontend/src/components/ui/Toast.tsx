export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast">
      <span className="dot dot--glow" style={{ background: "#79BE96", color: "#79BE96" }} />
      {message}
    </div>
  );
}
