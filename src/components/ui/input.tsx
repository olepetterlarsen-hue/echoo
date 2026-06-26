import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

// text-base (16 px) på mobil for å unngå iOS Safari sin auto-zoom på input-fokus.
// text-sm (14 px) på sm+ for å bevare desktop-density. Field-arbeid på iPhone
// får ellers en kort zoom-pulse hver gang man trykker i et felt.
const baseField =
  "w-full h-10 rounded-md px-3 text-base sm:text-sm bg-surface border border-border placeholder:text-text-3 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${baseField} ${className}`} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={`${baseField} h-auto py-2 ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-text-1">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-text-3 block">{hint}</span>}
      {error && <span className="text-xs text-red block">{error}</span>}
    </label>
  );
}
