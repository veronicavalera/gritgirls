// client/ui/UiKit.jsx
import React from "react";
import "./kit.css";

/* ====== Layout ====== */

export function Container({ children, size = "lg", className = "" }) {
  const widths = { sm: 720, md: 920, lg: 1140 };
  return (
    <div
      className={`ui-container ${className}`}
      style={{ maxWidth: widths[size] || widths.lg }}
    >
      {children}
    </div>
  );
}

export function Section({ title, subtitle, right, children }) {
  return (
    <section className="ui-section">
      {(title || subtitle || right) && (
        <header className="ui-section__head">
          <div>
            {title && <h2 className="ui-section__title">{title}</h2>}
            {subtitle && <p className="ui-section__subtitle">{subtitle}</p>}
          </div>
          {right ? <div className="ui-section__right">{right}</div> : null}
        </header>
      )}
      <div className="ui-section__body">{children}</div>
    </section>
  );
}

/* ====== Navbar ====== */

export function Navbar({ brand, children, right }) {
  return (
    <div className="ui-navbar">
      <div className="ui-navbar__inner">
        <div className="ui-navbar__brand">{brand}</div>
        <nav className="ui-navbar__links">{children}</nav>
        <div className="ui-navbar__right">{right}</div>
      </div>
    </div>
  );
}

export function NavLinkPill({ active, children, ...rest }) {
  return (
    <a
      {...rest}
      className={`ui-navpill ${active ? "is-active" : ""}`}
    >
      {children}
    </a>
  );
}

/* ====== Card ====== */

export function Card({ children, className = "" }) {
  return <div className={`ui-card ${className}`}>{children}</div>;
}

export function CardHeader({ overline, title, aside }) {
  return (
    <div className="ui-card__header">
      <div>
        {overline && <div className="ui-overline">{overline}</div>}
        {title && <h3 className="ui-card__title">{title}</h3>}
      </div>
      {aside ? <div className="ui-card__aside">{aside}</div> : null}
    </div>
  );
}

export function CardContent({ children, padded = true }) {
  return (
    <div className={`ui-card__content ${padded ? "padded" : ""}`}>{children}</div>
  );
}

/* ====== Buttons ====== */

export function Button({ variant = "primary", size = "md", children, className="", ...rest }) {
  return (
    <button
      {...rest}
      className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, ...rest }) {
  return (
    <button {...rest} className="ui-iconbtn" aria-label={label}>
      {children}
    </button>
  );
}

/* ====== Form fields ====== */

export function Field({ label, hint, error, children }) {
  return (
    <label className="ui-field">
      {label && <div className="ui-field__label">{label}</div>}
      {children}
      {(hint || error) && (
        <div className={`ui-field__hint ${error ? "is-error" : ""}`}>
          {error || hint}
        </div>
      )}
    </label>
  );
}

export const Input = React.forwardRef(function Input(props, ref) {
  return <input ref={ref} className="ui-input" {...props} />;
});

export const Select = React.forwardRef(function Select(props, ref) {
  return <select ref={ref} className="ui-input" {...props} />;
});

export const Textarea = React.forwardRef(function Textarea(props, ref) {
  return <textarea ref={ref} className="ui-input ui-textarea" {...props} />;
});

/* ====== Badges / Chips ====== */

export function Badge({ tone = "neutral", children }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

/* ====== Skeleton / Empty ====== */

export function Skeleton({ height = 14, width = "100%", rounded = 10 }) {
  return (
    <div
      className="ui-skeleton"
      style={{ height, width, borderRadius: rounded }}
    />
  );
}

export function EmptyState({ title = "Nothing here…", body, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__art">🚴‍♀️</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

/* ====== Divider / Row ====== */

export function Separator() {
  return <div className="ui-sep" />;
}

export function Row({ left, right }) {
  return (
    <div className="ui-row">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
