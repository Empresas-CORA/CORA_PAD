#!/usr/bin/env node
// Prueba el instalador con repositorios de mentira (en una carpeta temporal). No toca tus repos.
//   node scripts/test-install.mjs
// Comprueba, sobre todo, que NUNCA se pierde ni se sobrescribe algo del repositorio destino.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { instalar, fusionarSettings, fusionarLineas, fusionarBloque, MARCA_INICIO, MARCA_FIN } from './install-kit.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-install-'));
let pass = 0, fail = 0;
const check = (label, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'OK  ' : 'FALLA'}  ${label}${cond ? '' : '  ' + detail}`); };
const callar = { log: () => {} };
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const nuevoRepo = (nombre, commit = true) => {
  const d = path.join(tmp, nombre);
  fs.mkdirSync(d, { recursive: true });
  git(d, 'init', '-q');
  git(d, 'config', 'user.email', 't@t.t'); git(d, 'config', 'user.name', 't');
  return d;
};
const confirmar = (d) => { git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'base'); };
/** huella de todo el árbol (sin .git) */
const huella = (d, base = d, out = {}) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const abs = path.join(d, e.name);
    e.isDirectory() ? huella(abs, base, out) : (out[path.relative(base, abs).split(path.sep).join('/')] = sha(abs));
  }
  return out;
};
const lanza = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

// ===== 1. Funciones puras =====
console.log('--- funciones puras ---');
{
  const k = JSON.parse(fs.readFileSync(path.join(kit, '.claude', 'settings.json'), 'utf8'));
  const u = { permissions: { allow: ['Bash(npm test)'], deny: ['Read(./x)'] }, env: { FOO: '1', CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '3' }, hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mi-hook' }] }] }, model: 'opus' };
  const { fusionado, notas } = fusionarSettings(u, k);
  check('settings: conserva allow del usuario', fusionado.permissions.allow[0] === 'Bash(npm test)');
  check('settings: une deny sin duplicar', fusionado.permissions.deny.includes('Read(./x)') && fusionado.permissions.deny.includes('Read(./.env)'));
  check('settings: conserva el hook propio y agrega los del kit', fusionado.hooks.PreToolUse.length === 3 && fusionado.hooks.PreToolUse[0].hooks[0].command === 'mi-hook');
  check('settings: conserva env propio y avisa del valor en conflicto', fusionado.env.FOO === '1' && fusionado.env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH === '3' && notas.some((n) => n.includes('MAX_SUBAGENT')));
  check('settings: conserva claves ajenas (model)', fusionado.model === 'opus');
  const otra = fusionarSettings(fusionado, k);
  check('settings: segunda fusión no cambia nada (idempotente)', otra.cambio === false);
  check('settings: tolera formatos raros sin romper', !lanza(() => fusionarSettings({ hooks: 'x', env: [], permissions: 5 }, k)));
}
{
  const a = fusionarLineas('node_modules/\r\n.env\r\n', '.env\n.env.*\n!.env.example\nsecrets/\n');
  check('líneas: agrega solo las que faltan', a.agregadas === 3 && !/\.env\r\n[\s\S]*\.env\r\n[\s\S]*# ---.*\r\n\.env\r\n/.test(a.texto));
  check('líneas: conserva CRLF del destino', !/[^\r]\n/.test(a.texto));
  check('líneas: conserva el contenido original al principio', a.texto.startsWith('node_modules/\r\n.env\r\n'));
  check('líneas: idempotente', fusionarLineas(a.texto, '.env\n.env.*\n!.env.example\nsecrets/\n').agregadas === 0);
  check('líneas: destino sin salto final no pega líneas', fusionarLineas('a', 'b\n').texto.startsWith('a\n'));
}
{
  const a = fusionarBloque('# Mi proyecto\nreglas mías\n', '# Reglas del kit\n- P1\n');
  check('CLAUDE.md: agrega entre marcadores y conserva lo propio', a.estado === 'agregado' && a.texto.startsWith('# Mi proyecto\nreglas mías\n') && a.texto.includes(MARCA_INICIO) && a.texto.includes(MARCA_FIN));
  check('CLAUDE.md: segunda vez = igual', fusionarBloque(a.texto, '# Reglas del kit\n- P1\n').estado === 'igual');
  check('CLAUDE.md: contenido distinto = no lo reemplaza', fusionarBloque(a.texto, '# Otra cosa\n').estado === 'distinto');
  check('CLAUDE.md: si ya contiene el texto del kit (copiado y luego editado), no lo duplica', fusionarBloque('# Reglas del kit\n- P1\n\nmi línea nueva\n', '# Reglas del kit\n- P1\n').estado === 'igual');
}

// ===== 2. Repositorio vacío (como CORA_PAD) =====
console.log('--- repo vacío, sin commits ---');
{
  const d = nuevoRepo('vacio');
  const sim = instalar(d, { kitDir: kit, ...callar });
  check('simulación no escribe nada', fs.readdirSync(d).join() === '.git');
  const r = instalar(d, { aplicar: true, kitDir: kit, ...callar });
  check('aplica sin commits previos', r.cambios > 0);
  check('barreras activas', r.activas === true);
  check('no copia el instalador ni sus pruebas', !fs.existsSync(path.join(d, 'scripts', 'install-kit.mjs')) && !fs.existsSync(path.join(d, 'scripts', 'test-install.mjs')));
  check('no copia .claude/state', !fs.existsSync(path.join(d, '.claude', 'state')));
  check('deja entrada de bitácora', fs.readdirSync(path.join(d, 'docs', 'bitacora')).some((f) => /instalacion-kit\.md$/.test(f)));
  const t = spawnSync('node', ['scripts/test-hooks.mjs'], { cwd: d, encoding: 'utf8' });
  check('la suite de hooks pasa DENTRO del repo instalado', t.status === 0 && /0 con FALLA/.test(t.stdout), (t.stdout || '').slice(-300));
  const antes = huella(d);
  const r2 = instalar(d, { aplicar: true, kitDir: kit, forzar: true, ...callar });
  const despues = huella(d);
  const dif = Object.keys(despues).filter((k) => antes[k] !== despues[k] && !k.startsWith('docs/bitacora/'));
  check('segunda aplicación es idempotente (nada cambia salvo una entrada de bitácora)', dif.length === 0 && r2.acciones.every((a) => a.accion === 'IGUAL'), JSON.stringify(dif));
}

// ===== 3. Repo parecido a DAYCARE: README, .gitignore, docs/ y bitacora/ propios =====
console.log('--- repo con README, .gitignore, docs/ y bitacora/ propios ---');
{
  const d = nuevoRepo('daycare');
  fs.mkdirSync(path.join(d, 'docs', '01-planificacion'), { recursive: true });
  fs.mkdirSync(path.join(d, 'bitacora'), { recursive: true });
  fs.writeFileSync(path.join(d, 'README.md'), '# CORA DAYCARE\nmi readme con banner\n');
  fs.writeFileSync(path.join(d, '.gitignore'), '# Entornos y secretos\n.venv/\n.env\n.env.*\n');
  fs.writeFileSync(path.join(d, 'docs', '01-planificacion', 'plan.pdf'), Buffer.from([0x25, 0x50, 0x44, 0x46, 0, 1, 2, 255]));
  fs.writeFileSync(path.join(d, 'bitacora', '.gitkeep'), '');
  confirmar(d);
  const antes = huella(d);
  const sim = instalar(d, { kitDir: kit, ...callar });
  check('simulación no cambia ni un byte', JSON.stringify(huella(d)) === JSON.stringify(antes));
  check('simulación anuncia README -> docs/kit/README-KIT.md', sim.acciones.some((a) => a.ruta === 'docs/kit/README-KIT.md' && a.accion === 'COPIAR'));
  instalar(d, { aplicar: true, kitDir: kit, ...callar });
  const despues = huella(d);
  check('README.md propio: idéntico byte a byte', despues['README.md'] === antes['README.md']);
  check('PDF propio: idéntico byte a byte', despues['docs/01-planificacion/plan.pdf'] === antes['docs/01-planificacion/plan.pdf']);
  check('bitacora/ propia intacta', despues['bitacora/.gitkeep'] === antes['bitacora/.gitkeep']);
  check('README del kit guardado aparte', fs.existsSync(path.join(d, 'docs', 'kit', 'README-KIT.md')));
  const gi = fs.readFileSync(path.join(d, '.gitignore'), 'utf8');
  check('.gitignore: conserva sus líneas originales al inicio', gi.startsWith('# Entornos y secretos\n.venv/\n.env\n.env.*\n'));
  check('.gitignore: agrega !.env.example y .claude/state/', /^!\.env\.example$/m.test(gi) && /^\.claude\/state\/$/m.test(gi));
  check('.gitignore: no duplica .env', gi.split('\n').filter((l) => l.trim() === '.env').length === 1);
  const perdidos = Object.keys(antes).filter((k) => !(k in despues));
  check('ningún archivo previo desapareció', perdidos.length === 0);
  const modificados = Object.keys(antes).filter((k) => despues[k] && despues[k] !== antes[k]);
  check('solo se modificó .gitignore entre los archivos previos', modificados.join() === '.gitignore', modificados.join());
  check('git ve solo ese archivo versionado como modificado', git(d, 'status', '--porcelain', '--untracked-files=no').trim() === 'M .gitignore');
}

// ===== 4. Repo con CLAUDE.md, settings.json y archivos en conflicto =====
console.log('--- repo con CLAUDE.md, settings.json y conflictos ---');
{
  const d = nuevoRepo('conflictos');
  fs.mkdirSync(path.join(d, '.claude', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(d, 'docs', 'protocolos'), { recursive: true });
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '# Mis reglas\nusa tabs\n');
  fs.writeFileSync(path.join(d, '.claude', 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(npm test)'] }, hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mi-hook' }] }] } }, null, 2));
  fs.writeFileSync(path.join(d, '.claude', 'agents', 'ceo.md'), 'mi propio ceo');
  fs.writeFileSync(path.join(d, 'docs', 'protocolos', 'PROTOCOLOS.md'), 'mis protocolos');
  confirmar(d);
  const antes = huella(d);
  const r = instalar(d, { aplicar: true, kitDir: kit, ...callar });
  const despues = huella(d);
  check('ceo.md propio intacto', despues['.claude/agents/ceo.md'] === antes['.claude/agents/ceo.md']);
  check('PROTOCOLOS.md propio intacto', despues['docs/protocolos/PROTOCOLOS.md'] === antes['docs/protocolos/PROTOCOLOS.md']);
  check('versiones del kit guardadas como .kit-nuevo', fs.existsSync(path.join(d, '.claude', 'agents', 'ceo.md.kit-nuevo')) && fs.existsSync(path.join(d, 'docs', 'protocolos', 'PROTOCOLOS.md.kit-nuevo')));
  const cl = fs.readFileSync(path.join(d, 'CLAUDE.md'), 'utf8');
  check('CLAUDE.md: lo propio al inicio y el kit entre marcadores', cl.startsWith('# Mis reglas\nusa tabs\n') && cl.includes(MARCA_INICIO) && cl.includes('Comprobación de arranque'));
  const s = JSON.parse(fs.readFileSync(path.join(d, '.claude', 'settings.json'), 'utf8'));
  check('settings: conserva su hook y su permiso', s.hooks.PreToolUse[0].hooks[0].command === 'mi-hook' && s.permissions.allow[0] === 'Bash(npm test)');
  check('settings: hooks del kit presentes', r.activas === true && s.hooks.PreToolUse.length === 3);
  check('conflicto en agents NO apaga las barreras', r.activas === true);
  check('sin .kit-nuevo duplicados al repetir', (() => { const p = instalar(d, { aplicar: true, kitDir: kit, forzar: true, ...callar }); return p.acciones.filter((a) => a.accion === 'CONFLICTO').every((a) => !a.ejecutar); })());
}

// ===== 5. Negativas y seguridad =====
console.log('--- negativas ---');
{
  check('carpeta inexistente', /No existe/.test(lanza(() => instalar(path.join(tmp, 'nada'), { kitDir: kit, ...callar }))));
  const sinGit = path.join(tmp, 'singit'); fs.mkdirSync(sinGit);
  check('sin .git se niega', /git init/.test(lanza(() => instalar(sinGit, { kitDir: kit, ...callar }))));
  check('destino = el propio kit se niega', /propia carpeta/.test(lanza(() => instalar(kit, { kitDir: kit, ...callar }))));
  check('destino dentro del kit se niega', /DENTRO/.test(lanza(() => instalar(path.join(kit, 'docs'), { kitDir: kit, ...callar }))));

  const sucio = nuevoRepo('sucio');
  fs.writeFileSync(path.join(sucio, 'a.txt'), 'uno'); confirmar(sucio);
  fs.writeFileSync(path.join(sucio, 'a.txt'), 'dos');
  check('árbol con cambios: simula pero avisa', instalar(sucio, { kitDir: kit, ...callar }).advertencias.some((w) => /sin confirmar/.test(w)));
  check('árbol con cambios: se niega a aplicar', /sin confirmar/.test(lanza(() => instalar(sucio, { aplicar: true, kitDir: kit, ...callar }))));
  check('...y no escribió nada', !fs.existsSync(path.join(sucio, '.claude')));
  check('--forzar permite aplicar', !lanza(() => instalar(sucio, { aplicar: true, forzar: true, kitDir: kit, ...callar })));

  const malo = nuevoRepo('jsonroto');
  fs.mkdirSync(path.join(malo, '.claude'));
  fs.writeFileSync(path.join(malo, '.claude', 'settings.json'), '{ esto no es json');
  const rm = instalar(malo, { aplicar: true, kitDir: kit, ...callar });
  check('settings.json inválido: no se toca', fs.readFileSync(path.join(malo, '.claude', 'settings.json'), 'utf8') === '{ esto no es json');
  check('settings.json inválido: avisa que las barreras NO están activas', rm.activas === false);
  check('settings.json inválido: guarda el del kit aparte', fs.existsSync(path.join(malo, '.claude', 'settings.json.kit-nuevo')));

  const crlf = nuevoRepo('crlf');
  fs.writeFileSync(path.join(crlf, 'nota.md'), 'a\r\nb\r\n');
  git(crlf, 'config', 'core.autocrlf', 'false'); confirmar(crlf);
  const rc = instalar(crlf, { aplicar: true, kitDir: kit, ...callar });
  check('repo con .md en CRLF: no agrega .gitattributes (evita falsos cambios)', !fs.existsSync(path.join(crlf, '.gitattributes')) && rc.acciones.some((a) => a.ruta === '.gitattributes' && a.accion === 'OMITIR'));
  check('...y git no ve modificaciones en sus archivos', git(crlf, 'status', '--porcelain', '--untracked-files=no').trim() === '');
}

// ===== 6. Hooks vigilan el instalador =====
console.log('--- hooks vigilan el instalador ---');
{
  const d = nuevoRepo('hooks');
  instalar(d, { aplicar: true, kitDir: kit, ...callar });
  const hook = (n, input) => spawnSync('node', [path.join(d, '.claude', 'hooks', n)], { input: JSON.stringify({ cwd: d, ...input }), env: { ...process.env, CLAUDE_PROJECT_DIR: d }, encoding: 'utf8' }).status;
  check('un agente no puede ejecutar install-kit.mjs', hook('guard-bash.mjs', { tool_name: 'Bash', tool_input: { command: 'node scripts/install-kit.mjs ../otro --aplicar' } }) === 2);
  check('un agente no puede ejecutarlo desde PowerShell', hook('guard-bash.mjs', { tool_name: 'PowerShell', tool_input: { command: 'node .\\scripts\\install-kit.mjs ..\\otro --aplicar' } }) === 2);
  check('un agente no puede editar install-kit.mjs', hook('plan-gate.mjs', { tool_name: 'Write', tool_input: { file_path: path.join(d, 'scripts', 'install-kit.mjs') } }) === 2);
}

console.log(`\nResultado: ${pass} OK, ${fail} con FALLA`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
