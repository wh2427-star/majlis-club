import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";

const control =
  "block w-full min-h-tap rounded-control border-2 border-ink bg-white px-3 py-2 text-base text-ink";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

/** Label, optional hint and error. Errors use an icon and words, never colour alone. */
export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-sm font-semibold text-berry" role="alert">
          <Icon name="alert" size={18} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  id,
  label,
  hint,
  error,
  ...props
}: Omit<FieldShellProps, "children"> & ComponentProps<"input">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={props.name ?? id}
        className={control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  ...props
}: Omit<FieldShellProps, "children"> & ComponentProps<"textarea">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        name={props.name ?? id}
        rows={4}
        className={control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  options,
  ...props
}: Omit<FieldShellProps, "children"> &
  ComponentProps<"select"> & { options: { value: string; label: string }[] }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        name={props.name ?? id}
        className={control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  id,
  label,
  error,
  ...props
}: { id: string; label: ReactNode; error?: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-tap items-start gap-3">
        <input
          id={id}
          name={props.name ?? id}
          type="checkbox"
          className="mt-1 size-6 shrink-0 accent-emerald"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-sm font-semibold text-berry" role="alert">
          <Icon name="alert" size={18} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
