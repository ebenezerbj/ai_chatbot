$ErrorActionPreference = 'Stop'

# Exports PRESENTATION_DECK.marp.md to PowerPoint (.pptx) and PDF.
# Requires Node.js + npm. Uses npx to fetch Marp CLI on demand.

$repoRoot = Split-Path -Parent $PSScriptRoot
$input = Join-Path $repoRoot 'PRESENTATION_DECK.marp.md'
$pptx = Join-Path $repoRoot 'PRESENTATION_DECK.pptx'
$pdf = Join-Path $repoRoot 'PRESENTATION_DECK.pdf'

if (-not (Test-Path $input)) {
  throw "Missing deck: $input"
}

Write-Host "Exporting deck from: $input"

# PPTX
npx --yes @marp-team/marp-cli@latest $input --allow-local-files --pptx --output $pptx
Write-Host "Created: $pptx"

# PDF (optional)
npx --yes @marp-team/marp-cli@latest $input --allow-local-files --pdf --output $pdf
Write-Host "Created: $pdf"
