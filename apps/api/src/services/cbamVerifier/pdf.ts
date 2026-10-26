import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { VerifierResult } from '@newcarboscan/carbon-engine/cbam-verifier';
import { buildVerifierDocuments, type VerifierLead } from './emails.js';
export async function renderVerifierPdf(lead: VerifierLead, result: VerifierResult, date: string): Promise<Buffer> {
  const html = buildVerifierDocuments(lead, result, date).report.html.replace('</head>', '<style>@page { size:A4; margin:18mm; } body { font-size:10pt; } h1 { font-size:22pt; } h2 { font-size:14pt; break-after:avoid; } dt { margin-top:10pt; break-after:avoid; } dd { margin-left:0; } li { margin-bottom:7pt; } a { color:#075c43; }</style></head>');
  const python = process.env.REPORT_PDF_PYTHON || fileURLToPath(new URL('../../../../../services/pdf/.venv/bin/python', import.meta.url));
  const program = 'import sys\nfrom weasyprint import HTML\ndef no_resources(url):\n raise ValueError("External resources disabled")\nHTML(string=sys.stdin.read(), url_fetcher=no_resources).write_pdf(sys.stdout.buffer)\n';
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-c', program], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, killSignal: 'SIGKILL' });
    const parts: Buffer[] = []; let bytes = 0;
    child.stdout.on('data', (part: Buffer) => { bytes += part.length; if (bytes > 5_000_000) child.kill('SIGKILL'); else parts.push(part); });
    child.stderr.resume();
    child.on('error', () => reject(new Error('CBAM PDF renderer unavailable')));
    child.stdin.on('error', () => { /* The process close handler reports a generation failure. */ });
    child.on('close', code => { const pdf = Buffer.concat(parts); if (code !== 0 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) reject(new Error('CBAM PDF generation failed')); else resolve(pdf); });
    child.stdin.end(html);
  });
}
