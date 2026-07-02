import { riskLevel } from "../lib/severity";

export default function RiskScoreGauge({ score }: { score: number }) {
  const level = riskLevel(score);
  return (
    <div className={`risk-gauge risk-gauge--${level}`}>
      <span className="risk-gauge__score">{score}</span>
      <span className="risk-gauge__label">Risk score</span>
      <span className="risk-gauge__formula">10×críticas + 5×altas + 2×medias + 1×bajas</span>
    </div>
  );
}
