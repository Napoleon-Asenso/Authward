"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export function TextField({
  label,
  error,
  helperText,
  isPassword = false,
  id: idProp,
  value,
  onChange,
  className = "",
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const [showPassword, setShowPassword] = useState(false);

  const describedBy = [
    helperText ? helperId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-on-surface">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={onChange}
          type={
            isPassword ? (showPassword ? "text" : "password") : rest.type ?? "text"
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-on-surface outline-none transition-colors duration-150 placeholder:text-on-surface-variant/60 hover:border-on-surface-variant/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
            error
              ? "border-error"
              : "border-on-surface-variant/20"
          } ${isPassword ? "pr-10" : ""} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {helperText && (
        <p id={helperId} className="text-xs text-on-surface-variant">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
