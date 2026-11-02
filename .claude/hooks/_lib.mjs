// Utilidades compartidas por los hooks del kit. Sin dependencias externas (solo Node >= 18).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const READONLY_AGENTS = new Set(['ceo', 'cio', 'cto', 'ciso', 'cso', 'auditor']);

// Windows y macOS tratan "SRC" y "src" como el mismo archivo; las reglas deben hacerlo también.
// KIT_CASE_INSENSITIVE=1 permite simular ese comportamiento en pruebas desde Linux.
export const CASE_INSENSITIVE =
  process.env.KIT_CASE_INSENSITIVE === '1' || process.platform === 'win32' || process.platform === 'darwin';

// Lee y parsea el JSON de stdin. Falla CERRADO: si no se puede leer, bloquea (exit 2).
export function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    process.stderr.write('[KIT] El hook no pudo leer su entrada; se bloquea por seguridad.\n');
    process.exit(2);
  }
}

export function projectRoot(input) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
}

export const norm = (p) => p.replace(/\\/g, '/');

// Ruta relativa al proyecto con "/" como separador. Empieza con "../" si queda fuera.
// `pm` permite probar la semántica de Windows (path.win32) desde cualquier sistema.
export function relToRoot(root, file, pm = path) {
  const abs = pm.isAbsolute(file) ? file : pm.resolve(root, file);
  return norm(pm.relative(root, abs));
}

// Forma canónica para comparar con reglas: en Windows/macOS ignora mayúsculas y los puntos/espacios
// finales de cada segmento (Windows los descarta: ".env." es ".env").
export function canonRel(rel) {
  if (!CASE_INSENSITIVE) return rel;
  return rel
    .split('/')
    .map((s) => (/^\.+$/.test(s) ? s : s.replace(/[. ]+$/, '')))
    .join('/')
    .toLowerCase();
}

// Hash del contenido normalizado (CRLF->LF, sin BOM): que Git o el editor cambien los saltos de línea no invalida la aprobación.
export function sha256File(file) {
  const txt = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(txt, 'utf8').digest('hex');
}

// Convierte un glob simple (** y *) en RegExp. Rutas con "/".
export function globToRegExp(glob) {
  let g = norm(glob).replace(/^\.\//, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else { re += '.*'; }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+.()|{}[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$', CASE_INSENSITIVE ? 'i' : '');
}

// Lee `alcance_archivos` del front matter del plan (lista YAML simple).
export function parsePlanFrontMatter(text) {
  text = text.replace(/^﻿/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = { id: null, titulo: null, alcance: [] };
  if (!m) return out;
  const lines = m[1].split(/\r?\n/);
  let inScope = false;
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      inScope = kv[1] === 'alcance_archivos';
      if (kv[1] === 'id') out.id = kv[2].trim();
      if (kv[1] === 'titulo') out.titulo = kv[2].trim();
      continue;
    }
    if (inScope) {
      const item = line.match(/^\s*-\s+(.+?)\s*(#.*)?$/);
      if (item) out.alcance.push(item[1].replace(/^["']|["']$/g, ''));
    }
  }
  return out;
}

// Devuelve el estado de aprobación del plan vigente.
export function planStatus(root) {
  const stateFile = path.join(root, '.claude', 'state', 'approved-plan.json');
  if (!fs.existsSync(stateFile)) {
    return { valid: false, reason: 'No existe un plan aprobado (.claude/state/approved-plan.json).' };
  }
  let st;
  try { st = JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch { return { valid: false, reason: 'El archivo de aprobación está corrupto.' }; }
  const planFile = path.join(root, st.plan || '');
  if (!st.plan || !fs.existsSync(planFile)) {
    return { valid: false, reason: `El plan aprobado (${st.plan}) ya no existe.` };
  }
  if (sha256File(planFile) !== st.sha256) {
    return { valid: false, plan: st.plan, reason: `El plan ${st.plan} cambió después de aprobarse: la aprobación quedó invalidada. Requiere nueva aprobación humana.` };
  }
  const fm = parsePlanFrontMatter(fs.readFileSync(planFile, 'utf8'));
  if (!fm.alcance.length) {
    return { valid: false, plan: st.plan, reason: `El plan ${st.plan} no declara alcance_archivos.` };
  }
  return { valid: true, plan: st.plan, id: fm.id, scope: fm.alcance, scopeRe: fm.alcance.map(globToRegExp), approvedAt: st.approvedAt };
}

export function inScope(status, rel) {
  return status.scopeRe.some((re) => re.test(rel));
}

// Respuestas de hook
export function deny(msg) {
  process.stderr.write(`[KIT] BLOQUEADO: ${msg}\n`);
  process.exit(2);
}

export function ask(msg) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `[KIT] Punto crítico: ${msg}`,
    },
  }));
  process.exit(0);
}

export function allow() { process.exit(0); }
