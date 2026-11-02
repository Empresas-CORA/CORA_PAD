#!/usr/bin/env node
// Revoca la aprobación vigente (HUMANO). Tras esto, el código vuelve a quedar bloqueado hasta aprobar un plan.
//   node scripts/revoke-plan.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { norm } from '../.claude/hooks/_lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(root, '.claude', 'state', 'approved-plan.json');
if (!fs.existsSync(stateFile)) { console.log('No hay plan aprobado. Nada que revocar.'); process.exit(0); }

const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
fs.rmSync(stateFile);
const now = new Date();
const dir = path.join(root, 'docs', 'bitacora');
fs.mkdirSync(dir, { recursive: true });
const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
const entry = path.join(dir, `${now.toISOString().slice(0, 10)}_${stamp.slice(9)}_humano_revocacion-${st.id || 'plan'}.md`);
fs.writeFileSync(entry, `---
fecha: ${now.toISOString()}
autor: humano (${process.env.USER || process.env.USERNAME || 'humano'})
tipo: aprobacion
plan: ${st.id || st.plan}
---

# Revocación de ${st.id || st.plan}

Se revocó la aprobación del plan \`${st.plan}\`. El código queda bloqueado hasta aprobar un plan.
`);
console.log(`Aprobación revocada (${st.id || st.plan}). Bitácora: ${norm(path.relative(root, entry))}`);
