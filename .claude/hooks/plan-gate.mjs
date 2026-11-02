// PreToolUse (Write|Edit|MultiEdit|NotebookEdit): hace cumplir P5 (plan aprobado), P8 (carriles),
// P4 (bitácora solo-adición) y P10/P11 (puntos críticos y secretos).
import fs from 'node:fs';
import path from 'node:path';
import { READONLY_AGENTS, readInput, projectRoot, relToRoot, canonRel, planStatus, inScope, deny, ask, allow } from './_lib.mjs';

const input = readInput();
const root = projectRoot(input);
const tool = input.tool_name || '';
const agent = input.agent_type || 'main';
const ti = input.tool_input || {};
const file = ti.file_path || ti.notebook_path;
if (!file) allow();

const relRaw = relToRoot(root, file);   // para tocar el sistema de archivos
const rel = canonRel(relRaw);           // para comparar con reglas (sin mayúsculas ni puntos finales en Windows/macOS)
const base = path.posix.basename(rel);

// 0. Fuera del proyecto o con forma sospechosa.
if (rel === '..' || rel.startsWith('../') || rel.startsWith('//') || path.isAbsolute(rel) || /^[a-z]:/i.test(rel)) {
  ask(`${agent} intenta escribir fuera del proyecto: ${relRaw}`);
}
if (rel.includes(':')) {
  deny(`La ruta "${relRaw}" contiene ":" (flujos alternos de datos de Windows). No se permite.`);
}

// 1. Prohibido siempre para Claude: estado de aprobación, scripts de aprobación, .git, secretos.
if (/^\.claude\/state(\/|$)/i.test(rel) || /^scripts\/(approve-plan|revoke-plan|install-kit|test-install)\.mjs$/i.test(rel)) {
  deny(`${relRaw} solo lo modifica el humano (P5: la aprobación del plan no la puede dar un agente).`);
}
if (/^\.git(\/|$)/i.test(rel)) {
  deny(`${relRaw} es el interior de .git: ahí se pueden plantar hooks de git que ejecutan código. Usa comandos git normales.`);
}
if (/^\.env(\..+)?$/i.test(base) && base.toLowerCase() !== '.env.example') {
  deny(`${relRaw} es un archivo de secretos (P11). Usa .env.example con valores de ejemplo.`);
}

// 2. Roles de solo lectura (P8): nunca escriben.
if (READONLY_AGENTS.has(agent)) {
  deny(`El rol "${agent}" es de solo lectura. Entrega tu informe a la sesión principal; el escriba lo registra (P8).`);
}

// 3. Bitácora solo-adición (P4).
if (rel.startsWith('docs/bitacora/')) {
  const isTemplate = base.startsWith('_') || base === 'readme.md' || base === 'README.md';
  if (isTemplate) ask(`modificar la plantilla/README de la bitácora (${relRaw}).`);
  // La existencia se comprueba también por nombre normalizado: no depende de que el sistema de archivos ignore mayúsculas.
  let exists = fs.existsSync(path.join(root, relRaw));
  if (!exists && path.posix.dirname(rel) === 'docs/bitacora') {
    try { exists = fs.readdirSync(path.join(root, 'docs', 'bitacora')).some((n) => canonRel(n) === base); } catch { /* carpeta aún no existe */ }
  }
  if (tool !== 'Write' || exists) {
    deny(`La bitácora es solo-adición (P4): no se edita ${relRaw}. Crea una entrada NUEVA (tipo "corrección" si hay que rectificar).`);
  }
  allow();
}

// 4. Gobernanza del kit: cambios requieren aprobación humana (P10).
if (/^(claude(\.local)?\.md|\.mcp\.json)$/i.test(rel) || /^\.claude\//i.test(rel) || /^docs\/protocolos\//i.test(rel)) {
  ask(`modificar la gobernanza del kit (${relRaw}). Cambia reglas, agentes, hooks o conexiones.`);
}

// 5. El escriba solo escribe en docs/.
if (agent === 'escriba' && !rel.startsWith('docs/')) {
  deny(`El escriba solo escribe en docs/ (P8). Ruta solicitada: ${relRaw}`);
}

// 6. Documentación: libre sin plan (el plan en sí se redacta aquí).
if (rel.startsWith('docs/')) allow();

// 7. Todo lo demás es código/configuración: exige plan aprobado vigente y archivo dentro del alcance (P5, P6).
const st = planStatus(root);
if (!st.valid) {
  deny(`${st.reason} P5 (NO NEGOCIABLE): no se modifica código sin plan aprobado. Usa /nuevo-plan y pide al humano que apruebe con: node scripts/approve-plan.mjs <plan>`);
}
if (!inScope(st, rel)) {
  deny(`${relRaw} está FUERA del alcance del plan ${st.id || st.plan}. Alcance permitido: ${st.scope.join(', ')}. Es una anomalía (P10): detente, reporta y propón una enmienda del plan (nueva aprobación).`);
}
allow();
