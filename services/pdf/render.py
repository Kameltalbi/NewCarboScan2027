"""Compose un ReportViewModel JSON en PDF A4. Ne recalcule aucune émission."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import CSS, HTML

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model")
    parser.add_argument("-o", "--output", required=True)
    args = parser.parse_args()

    model_path = Path(args.model)
    report = json.loads(model_path.read_text(encoding="utf-8"))
    if report.get("schemaVersion") != "1.0":
        sys.exit("schemaVersion attendue : 1.0")
    if not report.get("sections"):
        sys.exit("Le modèle ne contient aucune section")

    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=select_autoescape(["html", "j2"]),
    )
    html = env.get_template("standard.html.j2").render(report=report)
    document = HTML(string=html, base_url=str(ROOT)).render(
        stylesheets=[CSS(filename=str(ROOT / "static" / "report.css"))],
    )
    pages = len(document.pages)
    # Garde-fou anti-page blanche, pas un objectif éditorial.
    if pages < 6 or pages > 48:
        sys.exit(f"Pagination anormale : {pages} pages")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    document.write_pdf(output)
    print(f"{output} ({pages} pages)")


if __name__ == "__main__":
    main()
