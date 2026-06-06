import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ expanded }: { expanded: boolean }) {
  const { i18n } = useTranslation();
  const isPT = i18n.language.startsWith("pt");
  const toggle = () => i18n.changeLanguage(isPT ? "en" : "pt-BR");

  return (
    <button
      type="button"
      className="rail-link rail-lang"
      onClick={toggle}
      title={isPT ? "Switch to English" : "Mudar para Português"}
    >
      <span className="rail-icon" style={{ fontSize: 15 }}>
        {isPT ? "🇧🇷" : "🇺🇸"}
      </span>
      {expanded
        ? <span className="rail-label">{isPT ? "Português" : "English"}</span>
        : <span className="tip">{isPT ? "PT" : "EN"}</span>
      }
    </button>
  );
}
