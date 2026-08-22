#!/usr/bin/env bash
# Gate CI : patterns d'affirmations carbone inventées dans le chemin réglementaire.
set -euo pipefail
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
FAIL=0

# Surfaces réglementaires / trust — pas le marketing WattBIM / ROI produit
TARGETS=(
  "$ROOT/apps/api/src"
  "$ROOT/packages/carbon-engine/src"
  "$ROOT/apps/web/src/integrations/api"
  "$ROOT/apps/web/src/modules/bilan-carbone"
  "$ROOT/apps/web/src/components/proof"
  "$ROOT/apps/web/src/lib/exports"
  "$ROOT/apps/web/src/lib/generateResultsPdf.ts"
  "$ROOT/apps/web/src/lib/services/ReportGeneratorService.ts"
  "$ROOT/apps/web/src/components/dashboard/HeroStyleDashboard.tsx"
)

PATTERNS=(
  '30\s*[-–]\s*50\s*%'
  'ROI\s*inférieur\s*à\s*24'
  '±\s*15\s*%'
  'potentiel technique de réduction est évalué entre'
  'Conforme ISO 14064'
  'certifié ISO 14064'
  'Objectif aligné SBTi'
  'Cible SBTi'
  'Objectif SBTi'
  'reductionTarget = 42'
)

for target in "${TARGETS[@]}"; do
  [ -e "$target" ] || continue
  for pat in "${PATTERNS[@]}"; do
    if grep -RInE --exclude='*.test.ts' --exclude='*.md' --exclude='*commentary.ts' "$pat" "$target" 2>/dev/null; then
      echo "FAIL invented-claim pattern /$pat/ in $target" >&2
      FAIL=1
    fi
  done
done

if [ "$FAIL" -ne 0 ]; then
  echo "Invented climate claims detected in regulatory surfaces." >&2
  exit 1
fi
echo "OK — no invented climate claim patterns in trust surfaces."
