export function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
        <div className="skeleton" style={{ height: 280 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="skeleton" />
          <div className="skeleton" style={{ animationDelay: "0.15s" }} />
          <div className="skeleton" style={{ animationDelay: "0.3s" }} />
          <div className="skeleton" style={{ animationDelay: "0.45s" }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 220, animationDelay: "0.2s" }} />
      <div className="mono" style={{ fontSize: 12, color: "rgba(245,241,237,0.40)", textAlign: "center" }}>
        Consultando API…
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  code,
  message,
  onRetry,
}: {
  title: string;
  code: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="state-box state-box--error">
      <span className="state-icon">!</span>
      <h3>{title}</h3>
      <code className="state-code">{code}</code>
      <p>{message}</p>
      <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCta,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="state-box state-box--empty" style={{ padding: "72px 32px", marginTop: 24 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" />
        <circle cx="36" cy="36" r="19" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
        <circle cx="36" cy="36" r="8" stroke="rgba(255,107,26,0.5)" strokeWidth="1.5" />
        <path d="M36 36 L56 22" stroke="#FF6B1A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="36" cy="36" r="2.5" fill="#FF6B1A" />
      </svg>
      <h3>{title}</h3>
      <p>{description}</p>
      {ctaLabel && onCta && (
        <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
