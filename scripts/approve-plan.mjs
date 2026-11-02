#!/usr/bin/env node
// Aprobación HUMANA de un plan (P5). Se ejecuta en TU terminal, no la ejecutan los agentes.
//   node scripts/approve-plan.mjs docs/plans/PLAN-001-nombre.md
// Registra el hash del plan: si el plan cambia después, la aprobación se invalida sola.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parsePlanFrontMatter, sha256File, norm } from '../.claude/hooks/_lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const assumeYes = args.includes('--yes');
const target = args.find((a) => !a.startsWith('--'));

function fail(msg) { console.error(`\nERROR: ${msg}\n`); process.exit(1); }

if (!target) fail('Uso: node scripts/approve-plan.mjs docs/plans/PLAN-001-nombre.md [--yes]');
const abs = path.resolve(process.cwd(), target);
const rel = norm(path.relative(root, abs));
if (!rel.startsWith('docs/plans/') || path.posix.basename(rel).startsWith('_')) fail('El plan debe estar en docs/plans/ y no ser una plantilla.');
if (!fs.existsSync(abs)) fail(`No existe ${rel}`);

const text = fs.readFileSync(abs, 'utf8');
const fm = parsePlanFrontMatter(text);
if (!fm.id) fail('El plan no tiene "id:" en el front matter.');
if (!fm.alcance.length) fail('El plan no declara "alcance_archivos:" (lista de rutas/globs que se podrán modificar).');
const tooBroad = fm.alcance.filter((g) => /^(\.\/)?(\*|\*\*|\*\*\/\*)$/.test(g.trim()));
if (tooBroad.length) fail(`Alcance demasiado amplio (${tooBroad.join(', ')}). Acótalo: la regla P6 pide tareas pequeñas.`);
const unsafe = fm.alcance.filter((g) => /(^|\/)\.\.(\/|$)|^\/|^[A-Za-z]:|\\/.test(g.trim()));
if (unsafe.length) fail(`Alcance con rutas no permitidas (${unsafe.join(', ')}): usa rutas relativas al proyecto con "/", sin ".." ni letras de unidad.`);
const governance = fm.alcance.filter((g) => {
  const t = g.trim().replace(/^\.\//, '');
  return /^(\.claude|\.git)(\/|$)/i.test(t) || /^docs\/protocolos(\/|$)/i.test(t) || /^claude(\.local)?\.md$/i.test(t) ||
    /^scripts\/(approve-plan|revoke-plan|test-hooks)\.mjs$/i.test(t) || /(^|\/)\.env/i.test(t);
});
if (governance.length) fail(`El alcance incluye rutas de gobernanza o secretos (${governance.join(', ')}). Esas rutas no se autorizan por plan: su cambio requiere confirmación humana aparte (P10).`);
const tareas = (text.match(/^#{2,4}\s+T\d+\b/gm) || []).length;
if (!tareas) fail('El plan no define tareas (encabezados "### T1 ...").');
if (/\[POR DEFINIR\]|\[PENDIENTE\]/i.test(text)) fail('El plan aún contiene marcadores [POR DEFINIR]/[PENDIENTE]. Resuélvelos (P2, P3).');

const hash = sha256File(abs);
console.log('\n=== APROBACIÓN DE PLAN ===');
console.log(`Plan:     ${rel}`);
console.log(`ID:       ${fm.id}`);
console.log(`Título:   ${fm.titulo || '(sin título)'}`);
console.log(`Tareas:   ${tareas}`);
console.log('Alcance (archivos que se podrán modificar):');
fm.alcance.forEach((g) => console.log(`  - ${g}`));
console.log(`SHA-256:  ${hash}\n`);

async function confirm() {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) fail('Sin terminal interactiva. Ejecuta el script en tu terminal o añade --yes si estás seguro.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((r) => rl.question(`Escribe el ID del plan (${fm.id}) para APROBAR, o Enter para cancelar: `, r));
  rl.close();
  return ans.trim() === fm.id;
}

if (!(await confirm())) { console.log('Cancelado. No se aprobó nada.'); process.exit(0); }

const stateDir = path.join(root, '.claude', 'state');
fs.mkdirSync(stateDir, { recursive: true });
const now = new Date();
const approvedBy = process.env.USER || process.env.USERNAME || 'humano';
fs.writeFileSync(path.join(stateDir, 'approved-plan.json'),
  JSON.stringify({ plan: rel, id: fm.id, sha256: hash, approvedAt: now.toISOString(), approvedBy }, null, 2) + '\n');

// Entrada de bitácora (solo-adición)
const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
const dir = path.join(root, 'docs', 'bitacora');
fs.mkdirSync(dir, { recursive: true });
const entry = path.join(dir, `${now.toISOString().slice(0, 10)}_${stamp.slice(9)}_humano_aprobacion-${fm.id}.md`);
fs.writeFileSync(entry, `---
fecha: ${now.toISOString()}
autor: humano (${approvedBy})
tipo: aprobacion
plan: ${fm.id}
---

# Aprobación de ${fm.id}

- Plan: \`${rel}\`
- SHA-256 aprobado: \`${hash}\`
- Alcance: ${fm.alcance.join(', ')}
- Efecto: se habilita la modificación de los archivos dentro del alcance. Si el plan cambia, la aprobación se invalida.
`);
console.log(`\nAprobado. Estado guardado en .claude/state/approved-plan.json\nBitácora: ${norm(path.relative(root, entry))}\n`);
