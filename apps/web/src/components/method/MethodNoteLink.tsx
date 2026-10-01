import { Link } from "react-router-dom";
import { methodNoteHref } from "@/lib/method/methodNotes";

export function MethodNoteLink({
  noteId,
  label = "Note de méthode",
}: {
  noteId: string;
  label?: string;
}) {
  return (
    <Link to={methodNoteHref(noteId)} className="text-xs text-primary underline underline-offset-2">
      {label}
    </Link>
  );
}
