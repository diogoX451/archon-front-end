import { Link } from "react-router-dom";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
};

// ConsentCheckbox is the standard "I have read and agree to the privacy
// policy and terms of use" affirmation. Required next to any form that
// collects PII for the first time (signup, first login of a new
// administrator). The links open the legal pages in a new tab so the
// user doesn't lose their form state.
export function ConsentCheckbox({ checked, onChange, id = "lgpd-consent" }: Props) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        color: "var(--ink-2)",
        cursor: "pointer",
        lineHeight: 1.5,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3 }}
        aria-label="Li e concordo com a Política de Privacidade e os Termos de Uso"
      />
      <span>
        Li e concordo com a{" "}
        <Link to="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
          Política de Privacidade
        </Link>
        {" "}e os{" "}
        <Link to="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
          Termos de Uso
        </Link>
        .
      </span>
    </label>
  );
}
