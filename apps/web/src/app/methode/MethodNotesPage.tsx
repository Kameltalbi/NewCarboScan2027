import { useEffect } from "react";
import { METHOD_NOTES, METHOD_NOTE_STATUS_LABEL } from "@/lib/method/methodNotes";

const STATUS_CLASS = {
  en_place: "bg-slate-100 text-slate-700",
  a_valider: "bg-amber-50 text-amber-800",
  bloque: "bg-rose-50 text-rose-800",
} as const;

export function MethodNotesPage() {
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6" data-testid="method-notes">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Notes de méthode</h1>
        <p className="text-sm text-muted-foreground">
          Comportement actuel de CarboScan et réserves ouvertes. Ces textes restent à valider ABC avant d&apos;être présentés comme une méthode publiée.
        </p>
      </header>
      <nav aria-label="Sommaire des notes de méthode">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {METHOD_NOTES.map((note) => (
            <li key={note.id}>
              <a href={`#${note.id}`} className="text-primary underline-offset-2 hover:underline">
                {note.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {METHOD_NOTES.map((note) => (
        <section key={note.id} id={note.id} className="scroll-mt-24 space-y-2 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{note.title}</h2>
            <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[note.status]}`}>
              {METHOD_NOTE_STATUS_LABEL[note.status]}
            </span>
          </div>
          {note.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
