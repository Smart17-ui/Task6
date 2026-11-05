// A label, an input, and its error message, connected for screen readers.
// Extra props (type, value, onChange...) are passed straight to the input.
// Use as="textarea" or as="select" to render those instead.
import { useId } from 'react';

export default function FormField({ label, error, hint, as: Input = 'input', children, ...inputProps }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        className="input"
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        {...inputProps}
      >
        {children}
      </Input>
      {error ? (
        <p id={messageId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
