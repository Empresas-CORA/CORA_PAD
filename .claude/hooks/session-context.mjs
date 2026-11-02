// SessionStart: inyecta contexto mínimo (estado del plan y últimas entradas de bitácora). stdout se añade al contexto.
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, planStatus } from './_lib.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* sin entrada: continuar */ }
const root = projectRoot(input);

const lines = ['[KIT] Protocolos activos (ver CLAUDE.md y docs/protocolos/PROTOCOLOS.md).'];
const st = planStatus(root);
if (st.valid) {
  lines.push(`[KIT] Plan vigente: ${st.id || st.plan} (${st.plan}), aprobado ${st.approvedAt}. Alcance: ${st.scope.join(', ')}`);
} else {
  lines.push(`[KIT] Sin plan vigente: ${st.reason} El código no se puede modificar hasta tener uno (P5).`);
}
try {
  const dir = path.join(root, 'docs', 'bitacora');
  const entries = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}_/.test(f)).sort().slice(-3);
  if (entries.length) lines.push(`[KIT] Últimas entradas de bitácora: ${entries.join(' | ')}`);
} catch { /* aún no hay bitácora */ }
process.stdout.write(lines.join('\n') + '\n');
