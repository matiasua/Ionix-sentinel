import { RISK_ARC } from "../../theme";

export function RiskScoreGauge({
  label,
  score,
  color,
  bg,
  levelLabel,
}: {
  label: string;
  score: number;
  color: string;
  bg: string;
  levelLabel: string;
}) {
  const gaugePct = Math.min(score / 50, 1);
  const dash = `${(gaugePct * RISK_ARC).toFixed(1)} 400`;

  return (
    <div className="risk-gauge">
      <span className="risk-gauge__label">{label}</span>
      <div className="risk-gauge__ring">
        <svg width="240" height="140" viewBox="0 0 200 118">
          <path d="M 20 108 A 80 80 0 0 1 180 108" stroke="#261F1F" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path
            d="M 20 108 A 80 80 0 0 1 180 108"
            stroke={color}
            strokeWidth="13"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={dash}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
          />
        </svg>
        <div className="risk-gauge__value" style={{ color }}>
          {score}
        </div>
      </div>
      <span className="risk-gauge__badge" style={{ color, background: bg }}>
        {levelLabel}
      </span>
      <span className="risk-gauge__formula">
        Fórmula: crítico ×10 + alto ×5 + medio ×2 + bajo ×1
        <br />
        sobre hallazgos activos
      </span>
    </div>
  );
}
