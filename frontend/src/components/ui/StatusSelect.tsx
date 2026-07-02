import type { Status } from "../../api/client";
import { STATUS_META } from "../../theme";

const STATUSES: Status[] = ["open", "acknowledged", "resolved", "false_positive"];

export function StatusSelect({ value, onChange }: { value: Status; onChange: (status: Status) => void }) {
  return (
    <select className="status-select" value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
