import type {
  ButtonHTMLAttributes,
  Ref,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/*
 * Shared form and action primitives. The sizes come from NewReservationPage,
 * the reference layout: 34px controls on phones, 32px from tablet up, body
 * text for fields and label text for actions. Sizing lives in index.css
 * (.pms-btn-*, .pms-input, .pms-label), so every page that uses these
 * components matches the reference without per-page classes.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success' | 'link' | 'text';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'pms-btn-primary',
  secondary: 'pms-btn-ghost',
  ghost: 'pms-btn-ghost',
  danger: 'pms-btn-danger',
  warning: 'pms-btn-primary !bg-warning-text hover:!bg-warning-text md:!px-4',
  success: 'pms-btn-primary !bg-success-text hover:!bg-success-text md:!px-4',
  link: 'inline-flex items-center text-label font-semibold text-[var(--color-primary)] hover:underline bg-transparent border-0 shadow-none min-h-0 p-0',
  /* Text action with no colour of its own: the caller sets the colour. */
  text: 'inline-flex items-center text-label font-semibold bg-transparent border-0 shadow-none min-h-0 p-0',
};

/** Action button. `icon` is any lucide element, rendered before the label. */
export function Button({
  variant = 'secondary',
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`${BUTTON_VARIANT[variant]} gap-1.5 whitespace-nowrap cursor-pointer ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Field label: the reference label style (text-label, bold, ink). */
export function FieldLabel({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block pms-label font-bold text-ink tracking-wide mb-1.5 ${className}`}
      {...rest}
    />
  );
}

/* Full width unless the caller sets its own width class. */
const fieldWidth = (className: string) => (/(^|\s)w-/.test(className) ? '' : 'w-full');

/** Single-line text input. */
export function TextField({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input className={`pms-input ${fieldWidth(className)} ${className}`} {...rest} />;
}

/** Dropdown with the same sizing as TextField. */
export function SelectField({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`pms-input ${fieldWidth(className)} cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Multi-line text input. */
export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`pms-input ${fieldWidth(className)} resize-none py-1.5 ${className}`} {...rest} />;
}

/** Icon-only action at the reference control height (34px phone, 32px tablet and up). */
export function IconButton({
  variant = 'ghost',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant | 'plain' }) {
  /* 'plain' is a borderless icon control (sidebar and toolbar icons). */
  const base = variant === 'plain'
    ? 'bg-transparent border-0 shadow-none rounded-xl'
    : BUTTON_VARIANT[variant];
  return (
    <button
      type={type}
      className={`${base} inline-flex shrink-0 cursor-pointer items-center justify-center p-0 h-[34px] w-[34px] md:h-[32px] md:w-[32px] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/*
 * Checkbox: the reference box from NewReservationPage (16px, 4px radius, primary
 * tint, soft focus ring). Pass `label` to get the reference label beside it.
 */
export function Checkbox({
  label,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  const box = (
    <input
      type="checkbox"
      className={`w-4 h-4 rounded border-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer ${className}`}
      {...rest}
    />
  );
  if (label === undefined) return box;
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      {box}
      <span className="pms-label font-semibold text-ink">{label}</span>
    </label>
  );
}

/*
 * ListItem: full-width row button used for dropdown items, menu rows and list
 * rows. Sizing matches the reference body text and control padding; layout,
 * colour and hover classes are passed in by the caller.
 */
export function ListItem({ className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`flex w-full items-center gap-2 text-left rounded-xl px-3 py-2 text-body font-medium transition-colors cursor-pointer ${className}`}
      {...rest}
    />
  );
}

/** Full-screen click target behind a dialog, drawer or flyout. */
export function Backdrop({ className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`pms-overlay-backdrop absolute inset-0 h-full w-full ${className}`} {...rest} />;
}
