import type { ReactNode } from "react";
import { cn } from "@/shared/cn";
import { PasswordInput } from "./PasswordInput";

export type ControlProps = {
  id: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  className: string;
};

type FormFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  textarea?: boolean;
  error?: string;
  hint?: string;
  /** Keeps what was typed when the server sends the form back with errors. */
  defaultValue?: string;
  /** For a select or other control: receives the props every control needs. */
  children?: (props: ControlProps) => ReactNode;
};

export function FormField({ id, label, type = "text", autoComplete, required, textarea, error, hint, defaultValue, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const props: ControlProps = {
    id,
    name: id,
    required,
    autoComplete,
    defaultValue,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    // text-base (16px) stops iOS Safari zooming in when a field is focused.
    className: cn(
      "min-h-11 w-full rounded-md border bg-card px-3 py-2.5 text-base text-text",
      error ? "border-2 border-maroon" : "border-field"
    ),
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.94rem] font-semibold">
        {label}
      </label>
      {children ? (
        children(props)
      ) : textarea ? (
        <textarea {...props} rows={4} />
      ) : type === "password" ? (
        <PasswordInput {...props} />
      ) : (
        <input {...props} type={type} />
      )}
      {hint && (
        <span id={hintId} className="text-[0.88rem] text-text-dim">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-[0.88rem] font-semibold text-maroon">
          {error}
        </span>
      )}
    </div>
  );
}
