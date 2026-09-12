import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "fr", name: "Français", short: "FR" },
  { code: "en", name: "English", short: "EN" },
  { code: "de", name: "Deutsch", short: "DE" },
  { code: "es", name: "Español", short: "ES" },
] as const;

const flagFrame =
  "relative inline-flex h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10";

const FlagCircle: React.FC<{ code: string }> = ({ code }) => {
  if (code === "en") {
    return (
      <span className={flagFrame}>
        <svg viewBox="0 0 60 30" className="h-full w-full" aria-hidden="true">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      </span>
    );
  }

  if (code === "de") {
    return (
      <span className={`${flagFrame} flex-col`}>
        <span className="h-1/3 w-full bg-black" />
        <span className="h-1/3 w-full bg-[#DD0000]" />
        <span className="h-1/3 w-full bg-[#FFCE00]" />
      </span>
    );
  }

  if (code === "es") {
    return (
      <span className={`${flagFrame} flex-col`}>
        <span className="h-[25%] w-full bg-[#AA151B]" />
        <span className="h-[50%] w-full bg-[#F1BF00]" />
        <span className="h-[25%] w-full bg-[#AA151B]" />
      </span>
    );
  }

  return (
    <span className={flagFrame}>
      <span className="h-full w-1/3 bg-[#002395]" />
      <span className="h-full w-1/3 bg-white" />
      <span className="h-full w-1/3 bg-[#ED2939]" />
    </span>
  );
};

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { i18n } = useTranslation();
  const langCode = (i18n.language || "fr").slice(0, 2);
  const current = LANGUAGES.find((l) => l.code === langCode) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={current.name}
          className={`group inline-flex items-center gap-2 rounded-full py-1 text-[#073D30] outline-none transition-colors hover:opacity-80 ${className ?? ""}`}
        >
          <FlagCircle code={current.code} />
          <span className="text-[14px] font-semibold tracking-[0.04em]">{current.short}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 font-jakarta">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
            className={`flex cursor-pointer items-center gap-3 ${
              current.code === language.code ? "bg-accent" : ""
            }`}
          >
            <FlagCircle code={language.code} />
            <span className="font-medium">{language.name}</span>
            <span className="ml-auto text-[12px] font-semibold text-muted-foreground">
              {language.short}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
