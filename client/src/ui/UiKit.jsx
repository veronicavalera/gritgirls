// client/ui/UiKit.jsx
// WHAT: eusable React components
// A design system (layout, cards, buttons, form inputs, badges, empties).
// All visual styling lives in ./kit.css; these components just apply semantic,
// consistent classNames and minimal logic so  pages stay clean.

import React from "react";
import "./kit.css";

/* ============================================================================
   Layout
   - Container constrains readable width (sm/md/lg) and centers content.
   - Section gives a page block with optional title/subtitle/right actions.
   ========================================================================== */

/** Constrains content to a max width and centers it.
 *  @param {'sm'|'md'|'lg'} size - width preset
 *  @param {string} className - extra classes to pass through
 */
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

/** Page block with optional header (title/subtitle) and right-aligned actions.
 *  Keeps markup consistent across pages.
 */
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

/* ============================================================================
   Navbar
   - Simple responsive nav bar: brand (left), links (middle), actions (right)
   - NavLinkPill: visually distinct links with an "active" state.
   ========================================================================== */

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

/** A link styled as a rounded "pill". Pass `active` to highlight current page. */
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

/* ============================================================================
   Cards
   - Card: base container with border + shadow
   - CardHeader: optional overline (eyebrow), title, and right-aligned "aside"
   - CardContent: inner content with optional padding toggle
   ========================================================================== */

export function Card({ children, className = "" }) {
  return <div className={`ui-card ${className}`}>{children}</div>;
}

/** Header slot for cards: overline (small label), title, and a right slot. */
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

/** Card body. Pass `padded={false}` for edge-to-edge content (e.g., images). */
export function CardContent({ children, padded = true }) {
  return (
    <div className={`ui-card__content ${padded ? "padded" : ""}`}>{children}</div>
  );
}

/* ============================================================================
   Buttons
   - Button: variants controlled by BEM classes (primary/neutral/outline/etc)
   - IconButton: square icon-only button with accessible label
   ========================================================================== */

/** General-purpose button.
 *  @param {'primary'|'neutral'|'outline'|'danger'|'soft'|'brand'} variant
 *  @param {'sm'|'md'|'lg'} size
 *  Pass any native <button> props (onClick, type, disabled, etc) via ...rest.
 */
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

/** Icon-only button (e.g., for carousels). Always provide a descriptive `label`. */
export function IconButton({ label, children, ...rest }) {
  return (
    <button {...rest} className="ui-iconbtn" aria-label={label}>
      {children}
    </button>
  );
}

/* ============================================================================
   Form fields
   - Field: wraps a control with a label, hint, and optional error message
   - Input/Select/Textarea: pass-through inputs with consistent classes
   ========================================================================== */

/** Field wrapper that displays label + hint/error under the control.
 *  Use like:
 *    <Field label="Email" error={err}><Input .../></Field>
 */
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

// Inputs are forwardRef so parent forms can programmatically focus/measure them.
export const Input = React.forwardRef(function Input(props, ref) {
  return <input ref={ref} className="ui-input" {...props} />;
});

export const Select = React.forwardRef(function Select(props, ref) {
  return <select ref={ref} className="ui-input" {...props} />;
});

export const Textarea = React.forwardRef(function Textarea(props, ref) {
  return <textarea ref={ref} className="ui-input ui-textarea" {...props} />;
});

/* ============================================================================
   Badges / Chips
   - Small, rounded labels to highlight counts/state (tone: brand|neutral|warn…)
   ========================================================================== */

export function Badge({ tone = "neutral", children }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

/* ============================================================================
   Skeleton / Empty state
   - Skeleton: gray block used while loading data
   - EmptyState: friendly empty screen with emoji art + CTA
   ========================================================================== */

export function Skeleton({ height = 14, width = "100%", rounded = 10 }) {
  return (
    <div
      className="ui-skeleton"
      style={{ height, width, borderRadius: rounded }}
    />
  );
}

/** Use when a list/page has no content yet; pass an action (e.g., "+ Create"). */
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

/* ============================================================================
   Misc layout helpers
   - Separator: subtle horizontal divider
   - Row: two-column row with left/right slots that space apart
   ========================================================================== */

export function Separator() {
  return <div className="ui-sep" />;
}

/** Flex row with space-between. Good for label/value or title/actions. */
export function Row({ left, right }) {
  return (
    <div className="ui-row">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
