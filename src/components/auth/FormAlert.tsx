interface FormAlertProps {
  message: string | null;
}

export function FormAlert({ message }: FormAlertProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-error bg-error-container px-3 py-2 text-sm text-on-error-container"
    >
      {message}
    </div>
  );
}
