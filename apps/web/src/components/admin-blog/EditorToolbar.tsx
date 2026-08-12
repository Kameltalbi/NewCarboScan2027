import React from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link2, Quote, Code, Pilcrow } from "lucide-react";

interface Props {
  textareaId: string;
  value: string;
  onChange: (v: string) => void;
}

type Action =
  | { kind: "wrap"; before: string; after: string }
  | { kind: "block"; before: string; after: string }
  | { kind: "list"; tag: "ul" | "ol" }
  | { kind: "link" };

const BUTTONS: { label: string; icon: React.ElementType; action: Action }[] = [
  { label: "Gras", icon: Bold, action: { kind: "wrap", before: "<strong>", after: "</strong>" } },
  { label: "Italique", icon: Italic, action: { kind: "wrap", before: "<em>", after: "</em>" } },
  { label: "Souligné", icon: Underline, action: { kind: "wrap", before: "<u>", after: "</u>" } },
  { label: "Paragraphe", icon: Pilcrow, action: { kind: "block", before: "<p>", after: "</p>" } },
  { label: "Titre 2", icon: Heading2, action: { kind: "block", before: "<h2>", after: "</h2>" } },
  { label: "Titre 3", icon: Heading3, action: { kind: "block", before: "<h3>", after: "</h3>" } },
  { label: "Liste à puces", icon: List, action: { kind: "list", tag: "ul" } },
  { label: "Liste numérotée", icon: ListOrdered, action: { kind: "list", tag: "ol" } },
  { label: "Citation", icon: Quote, action: { kind: "block", before: "<blockquote>", after: "</blockquote>" } },
  { label: "Code", icon: Code, action: { kind: "wrap", before: "<code>", after: "</code>" } },
  { label: "Lien", icon: Link2, action: { kind: "link" } },
];

export const EditorToolbar: React.FC<Props> = ({ textareaId, value, onChange }) => {
  const apply = (action: Action) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let inserted = "";
    if (action.kind === "link") {
      const url = window.prompt("URL du lien", "https://");
      if (!url) return;
      inserted = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selected || "texte du lien"}</a>`;
    } else if (action.kind === "list") {
      const lines = (selected || "Élément").split("\n").filter(Boolean);
      inserted = `<${action.tag}>\n${lines.map((l) => `  <li>${l}</li>`).join("\n")}\n</${action.tag}>`;
    } else if (action.kind === "block") {
      inserted = `${action.before}${selected || "Texte"}${action.after}`;
    } else {
      inserted = `${action.before}${selected || "Texte"}${action.after}`;
    }

    const next = value.slice(0, start) + inserted + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border rounded-md p-1 bg-muted/40">
      {BUTTONS.map(({ label, icon: Icon, action }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          aria-label={label}
          className="h-8 w-8 p-0"
          onClick={() => apply(action)}
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
};
