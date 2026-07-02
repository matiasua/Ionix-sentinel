import { Status } from "../api/client";
import { STATUS_LABELS } from "../lib/severity";

const STATUSES: Status[] = ["open", "acknowledged", "resolved", "false_positive"];

export default function StatusSelect({
  status,
  onChange,
  disabled,
}: {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="status-select"
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Status)}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
