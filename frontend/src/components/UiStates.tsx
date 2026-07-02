export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return <div className="ui-state ui-state--loading">{message}</div>;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ui-state ui-state--error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ui-state ui-state--empty">
      <p>{message}</p>
      {action}
    </div>
  );
}
