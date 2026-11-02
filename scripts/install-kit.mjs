#!/usr/bin/env node
// Instala el kit en un repositorio que YA existe, sin sobrescribir nada suyo.
//   node scripts/install-kit.mjs "<ruta-del-repo>"            simula: muestra qué haría y NO escribe
//   node scripts/install-kit.mjs "<ruta-del-repo>" --aplicar  escribe
// Lo ejecuta el humano, en su terminal, desde la carpeta del kit. Los agentes no deben ejecutarlo.
//
// Reglas (todas probadas en scripts/test-install.mjs):
//  - Nunca sobrescribe un archivo existente que sea distinto.
//  - README.md existente  -> el del kit va a docs/kit/README-KIT.md.
//  - .gitignore / .gitattributes -> solo agrega las líneas que faltan, al final.
//  - CLAUDE.md existente  -> agrega el contenido del kit entre marcadores, al final.
//  - .claude/settings.json existente -> fusiona (env, permisos, hooks) conservando lo tuyo.
//  - Cualquier otro choque -> guarda lo del kit como <archivo>.kit-nuevo para que lo compares.
//  - Con cambios sin confirmar en archivos versionados, se niega a aplicar (usa --forzar para saltarlo).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MARCA_INICIO = '<!-- kit-agentes:inicio -->';
export const MARCA_FIN = '<!-- kit-agentes:fin -->';
const CABECERA = '# --- kit-agentes: líneas agregadas por install-kit.mjs ---';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- utilidades puras ----------
const rel = (p) => p.split(path.sep).join('/');
const sinBOM = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const lf = (s) => s.replace(/\r\n/g, '\n');
const leer = (p) => sinBOM(fs.readFileSync(p, 'utf8'));
const esObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

// Rutas del kit que NO se copian al repositorio destino.
const OMITIR = [
  /^\.git(\/|$)/, /(^|\/)node_modules(\/|$)/, /^\.claude\/state(\/|$)/, /^\.claude\/settings\.local\.json$/,
  /^CLAUDE\.local\.md$/, /^scripts\/install-kit\.mjs$/, /^scripts\/test-install\.mjs$/, /\.zip$/i, /\.kit-nuevo$/,
];

function recorrer(dir, base = dir, salida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const r = rel(path.relative(base, abs));
    if (OMITIR.some((re) => re.test(r))) continue;
    e.isDirectory() ? recorrer(abs, base, salida) : salida.push(r);
  }
  return salida.sort();
}

/** Fusiona el settings.json del kit dentro del existente. Conserva todo lo del usuario. */
export function fusionarSettings(destino, kitCfg) {
  const out = structuredClone(destino);
  const notas = [];
  const firma = (e) => JSON.stringify([e.matcher || '', (e.hooks || []).map((h) => [h.type, h.command, h.args || null])]);
  for (const [k, v] of Object.entries(kitCfg)) {
    if (!(k in out)) { out[k] = structuredClone(v); continue; }
    if (k === '$schema') continue;
    if (k === 'env' && esObj(v) && esObj(out.env)) {
      for (const [ek, ev] of Object.entries(v)) {
        if (!(ek in out.env)) out.env[ek] = ev;
        else if (out.env[ek] !== ev) notas.push(`env.${ek}: se conservó tu valor "${out.env[ek]}" (el kit usa "${ev}"); revísalo`);
      }
    } else if (k === 'permissions' && esObj(v) && esObj(out.permissions)) {
      for (const [pk, pv] of Object.entries(v)) {
        if (Array.isArray(pv) && (Array.isArray(out.permissions[pk]) || !(pk in out.permissions))) {
          out.permissions[pk] = out.permissions[pk] || [];
          for (const x of pv) if (!out.permissions[pk].includes(x)) out.permissions[pk].push(x);
        } else if (!(pk in out.permissions)) out.permissions[pk] = pv;
        else notas.push(`permissions.${pk}: tiene un formato distinto; se conservó el tuyo`);
      }
    } else if (k === 'hooks' && esObj(v) && esObj(out.hooks)) {
      for (const [ev, entradas] of Object.entries(v)) {
        if (!Array.isArray(out.hooks[ev]) && ev in out.hooks) { notas.push(`hooks.${ev}: formato inesperado; se conservó el tuyo y NO se agregó el del kit`); continue; }
        out.hooks[ev] = out.hooks[ev] || [];
        const tiene = new Set(out.hooks[ev].map(firma));
        for (const e of entradas) if (!tiene.has(firma(e))) out.hooks[ev].push(structuredClone(e));
      }
    } else if (JSON.stringify(out[k]) !== JSON.stringify(v)) {
      notas.push(`${k}: ya existía con otro valor; se conservó el tuyo`);
    }
  }
  return { fusionado: out, notas, cambio: JSON.stringify(out) !== JSON.stringify(destino) };
}

/** ¿Están todas las entradas de hooks del kit presentes en `cfg`? (barreras activas) */
export function barrerasActivas(cfg, kitCfg) {
  if (!esObj(cfg) || !esObj(cfg.hooks)) return false;
  const firma = (e) => JSON.stringify([e.matcher || '', (e.hooks || []).map((h) => [h.type, h.command, h.args || null, h.onFailure || null])]);
  for (const [ev, entradas] of Object.entries(kitCfg.hooks)) {
    const tiene = new Set((Array.isArray(cfg.hooks[ev]) ? cfg.hooks[ev] : []).map(firma));
    if (!entradas.every((e) => tiene.has(firma(e)))) return false;
  }
  return true;
}

/** Agrega al final solo las líneas del kit que faltan. Conserva el estilo de salto de línea. */
export function fusionarLineas(textoDestino, textoKit) {
  const eol = textoDestino.includes('\r\n') ? '\r\n' : '\n';
  const tiene = new Set(lf(textoDestino).split('\n').map((l) => l.trim()));
  const faltan = lf(textoKit).split('\n').filter((l) => l.trim() && !tiene.has(l.trim()));
  if (!faltan.length) return { texto: textoDestino, agregadas: 0 };
  const base = textoDestino.endsWith('\n') || textoDestino === '' ? textoDestino : textoDestino + eol;
  return { texto: base + (textoDestino ? eol : '') + [CABECERA, ...faltan].join(eol) + eol, agregadas: faltan.length };
}

/** Agrega el contenido del kit a un CLAUDE.md existente, entre marcadores. */
export function fusionarBloque(textoDestino, textoKit) {
  const bloque = `${MARCA_INICIO}\n${lf(textoKit).trim()}\n${MARCA_FIN}`;
  if (lf(textoDestino).includes(lf(textoKit).trim())) return { texto: textoDestino, estado: 'igual' }; // ya contiene el texto del kit (p. ej. se copió y luego se editó)
  if (textoDestino.includes(MARCA_INICIO)) {
    const a = textoDestino.indexOf(MARCA_INICIO);
    const b = textoDestino.indexOf(MARCA_FIN);
    const actual = b > a ? lf(textoDestino.slice(a, b + MARCA_FIN.length)) : '';
    return { texto: textoDestino, estado: actual === bloque ? 'igual' : 'distinto' };
  }
  const eol = textoDestino.includes('\r\n') ? '\r\n' : '\n';
  const sep = textoDestino.endsWith('\n') ? eol : eol + eol;
  return { texto: textoDestino + sep + bloque.replace(/\n/g, eol) + eol, estado: 'agregado' };
}

// ---------- instalación ----------
export function instalar(destinoArg, { aplicar = false, forzar = false, kitDir = kit, log = console.log } = {}) {
  const destino = path.resolve(destinoArg);
  const fallo = (m) => { throw new Error(m); };

  if (!fs.existsSync(destino) || !fs.statSync(destino).isDirectory()) fallo(`No existe la carpeta: ${destino}`);
  const r1 = path.relative(kitDir, destino);
  if (r1 === '') fallo('El destino es la propia carpeta del kit. Indica la carpeta del repositorio donde quieres instalarlo.');
  if (!r1.startsWith('..') && !path.isAbsolute(r1)) fallo('El destino está DENTRO de la carpeta del kit. Indica la carpeta del repositorio.');
  if (!fs.existsSync(path.join(destino, '.git'))) fallo(`"${destino}" no es un repositorio git (no tiene .git). Ejecuta primero: git init`);

  const advertencias = [];
  const r2 = path.relative(destino, kitDir);
  if (!r2.startsWith('..') && !path.isAbsolute(r2)) advertencias.push(`La carpeta del kit está dentro del repositorio destino (${rel(r2)}). Bórrala o ignórala tras instalar; no debe versionarse.`);

  const git = (...a) => execFileSync('git', ['-C', destino, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let rama = '(desconocida)', sucio = null, crlf = 0;
  // Cada consulta va por separado: en un repo recién creado (sin commits) "rev-parse HEAD" falla, pero status y symbolic-ref funcionan.
  try { rama = git('symbolic-ref', '--short', 'HEAD').trim(); } catch { /* HEAD separado u otro caso: se deja "(desconocida)" */ }
  try { sucio = git('status', '--porcelain', '--untracked-files=no').trim().split('\n').filter(Boolean); }
  catch { advertencias.push('No pude ejecutar git en el destino; no verifiqué el estado del árbol.'); }
  try { crlf = git('ls-files', '--eol').split('\n').filter((l) => /^i\/crlf\b/.test(l) && /\.(md|mjs|json|sh)\s*$/.test(l)).length; } catch { /* sin dato */ }
  if (sucio && sucio.length) {
    const m = `Hay ${sucio.length} archivo(s) versionado(s) con cambios sin confirmar. Haz commit o stash antes (así podrás revertir con git).`;
    if (aplicar && !forzar) fallo(m + ' (--forzar para ignorarlo)');
    advertencias.push(m);
  }
  if (sucio === null && aplicar && !forzar) fallo('No pude comprobar el estado de git; no aplico sin verificarlo (--forzar para ignorarlo).');
  if (/^(main|master)$/.test(rama)) advertencias.push(`Estás en la rama "${rama}". Recomendado: git switch -c chore/instalar-kit antes de aplicar.`);

  const kitSettings = JSON.parse(leer(path.join(kitDir, '.claude', 'settings.json')));
  const acciones = []; // { ruta, accion, detalle, ejecutar }
  const nota = [];
  let settingsFinal = null;

  for (const r of recorrer(kitDir)) {
    const src = path.join(kitDir, ...r.split('/'));
    const bytesKit = fs.readFileSync(src);
    const textoKit = sinBOM(bytesKit.toString('utf8'));
    let rd = r; // ruta destino
    const existe = (x) => fs.existsSync(path.join(destino, ...x.split('/')));
    const dst = (x) => path.join(destino, ...x.split('/'));
    const escribir = (x, contenido) => { fs.mkdirSync(path.dirname(dst(x)), { recursive: true }); fs.writeFileSync(dst(x), contenido); };

    // Un README propio y distinto no se pisa: el del kit va aparte. Si el README ya ES el del kit, no hay nada que mover.
    if (r === 'README.md' && existe('README.md') && lf(leer(dst('README.md'))) !== lf(textoKit)) rd = 'docs/kit/README-KIT.md';

    if (r === '.gitignore' || r === '.gitattributes') {
      if (r === '.gitattributes' && crlf > 0) {
        acciones.push({ ruta: r, accion: 'OMITIR', detalle: `${crlf} archivo(s) versionados usan CRLF; agregar las reglas de LF los marcaría como modificados. Normalízalos antes (git add --renormalize .) y repite.` });
        continue;
      }
      if (!existe(r)) { acciones.push({ ruta: r, accion: 'COPIAR', ejecutar: () => escribir(r, bytesKit) }); continue; }
      const actual = leer(dst(r));
      const { texto, agregadas } = fusionarLineas(actual, textoKit);
      agregadas
        ? acciones.push({ ruta: r, accion: 'FUSIONAR', detalle: `agrega ${agregadas} línea(s) al final; las tuyas quedan intactas`, ejecutar: () => escribir(r, texto) })
        : acciones.push({ ruta: r, accion: 'IGUAL', detalle: 'ya contiene todo lo del kit' });
      continue;
    }

    if (r === '.claude/settings.json') {
      if (!existe(r)) { settingsFinal = kitSettings; acciones.push({ ruta: r, accion: 'COPIAR', ejecutar: () => escribir(r, bytesKit) }); continue; }
      let actual;
      try { actual = JSON.parse(leer(dst(r))); if (!esObj(actual)) throw new Error('no es un objeto'); }
      catch (e) {
        acciones.push({ ruta: r, accion: 'CONFLICTO', detalle: `tu settings.json no es JSON válido (${e.message}); NO se tocó. Guardo el del kit como ${r}.kit-nuevo. Las barreras NO quedan activas hasta que lo resuelvas.`, ejecutar: () => escribir(`${r}.kit-nuevo`, bytesKit) });
        continue;
      }
      const { fusionado, notas, cambio } = fusionarSettings(actual, kitSettings);
      settingsFinal = fusionado;
      nota.push(...notas);
      cambio
        ? acciones.push({ ruta: r, accion: 'FUSIONAR', detalle: 'agrega hooks, permisos y variables del kit; conserva los tuyos', ejecutar: () => escribir(r, JSON.stringify(fusionado, null, 2) + '\n') })
        : acciones.push({ ruta: r, accion: 'IGUAL', detalle: 'ya contiene todo lo del kit' });
      continue;
    }

    if (r === 'CLAUDE.md') {
      if (!existe(r)) { acciones.push({ ruta: r, accion: 'COPIAR', ejecutar: () => escribir(r, bytesKit) }); continue; }
      if (lf(leer(dst(r))) === lf(textoKit)) { acciones.push({ ruta: r, accion: 'IGUAL', detalle: 'es el del kit' }); continue; }
      const { texto, estado } = fusionarBloque(leer(dst(r)), textoKit);
      if (estado === 'agregado') acciones.push({ ruta: r, accion: 'FUSIONAR', detalle: 'agrega las reglas del kit al final, entre marcadores; lo tuyo queda intacto', ejecutar: () => escribir(r, texto) });
      else if (estado === 'igual') acciones.push({ ruta: r, accion: 'IGUAL', detalle: 'el bloque del kit ya está' });
      else acciones.push({ ruta: r, accion: 'REVISAR', detalle: 'ya tiene un bloque del kit pero con otro contenido; no lo reemplazo. Compáralo a mano con el CLAUDE.md del kit.' });
      continue;
    }

    // Caso general
    if (!existe(rd)) { acciones.push({ ruta: rd, accion: 'COPIAR', detalle: rd !== r ? `(el ${r} del kit va aquí porque ya tienes uno)` : undefined, ejecutar: () => escribir(rd, bytesKit) }); continue; }
    const igual = lf(sinBOM(fs.readFileSync(dst(rd), 'utf8'))) === lf(textoKit);
    if (igual) { acciones.push({ ruta: rd, accion: 'IGUAL', detalle: 'idéntico' }); continue; }
    const nuevo = `${rd}.kit-nuevo`;
    if (existe(nuevo) && lf(sinBOM(fs.readFileSync(dst(nuevo), 'utf8'))) === lf(textoKit)) { acciones.push({ ruta: rd, accion: 'CONFLICTO', detalle: `ya existe y es distinto; la versión del kit ya está en ${nuevo}` }); continue; }
    acciones.push({ ruta: rd, accion: 'CONFLICTO', detalle: `ya existe y es distinto; NO se sobrescribe. Versión del kit en ${nuevo}`, ejecutar: () => escribir(nuevo, bytesKit) });
  }

  // ---------- informe ----------
  const cuenta = (a) => acciones.filter((x) => x.accion === a).length;
  const cambios = acciones.filter((x) => x.ejecutar).length;
  log(`\nDestino: ${destino}\nRama:    ${rama}\nModo:    ${aplicar ? 'APLICAR (escribe archivos)' : 'SIMULACIÓN (no escribe nada)'}\n`);
  for (const a of acciones) if (a.accion !== 'IGUAL') log(`${a.accion.padEnd(9)} ${a.ruta}${a.detalle ? '  — ' + a.detalle : ''}`);
  log(`\nResumen: ${cuenta('COPIAR')} copiar · ${cuenta('FUSIONAR')} fusionar · ${cuenta('CONFLICTO')} conflicto(s) · ${cuenta('OMITIR') + cuenta('REVISAR')} para revisar · ${cuenta('IGUAL')} ya estaban`);
  for (const n of nota) log(`NOTA: ${n}`);
  for (const w of advertencias) log(`AVISO: ${w}`);

  if (aplicar) {
    for (const a of acciones) if (a.ejecutar) a.ejecutar();
    const ahora = new Date();
    const dia = ahora.toISOString().slice(0, 10);
    const hm = ahora.toISOString().slice(11, 16).replace(':', '');
    const dir = path.join(destino, 'docs', 'bitacora');
    fs.mkdirSync(dir, { recursive: true });
    let n = 0, archivo;
    do { archivo = path.join(dir, `${dia}_${hm}${n ? '-' + n : ''}_humano_instalacion-kit.md`); n++; } while (fs.existsSync(archivo));
    const filas = acciones.filter((x) => x.accion !== 'IGUAL').map((x) => `| ${x.accion} | \`${x.ruta}\` | ${x.detalle || ''} |`).join('\n');
    fs.writeFileSync(archivo, `---\nfecha: ${ahora.toISOString()}\nautor: humano (install-kit.mjs)\ntipo: instalacion\n---\n\n# Instalación del kit\n\n- Rama: \`${rama}\`\n- Resumen: ${cuenta('COPIAR')} copiados, ${cuenta('FUSIONAR')} fusionados, ${cuenta('CONFLICTO')} conflicto(s), ${cuenta('OMITIR') + cuenta('REVISAR')} por revisar.\n\n| Acción | Archivo | Detalle |\n|---|---|---|\n${filas}\n`);
    log(`\nBitácora: ${rel(path.relative(destino, archivo))}`);
  }

  // ---------- ¿quedan activas las barreras? ----------
  let final = settingsFinal;
  if (aplicar) { try { final = JSON.parse(leer(path.join(destino, '.claude', 'settings.json'))); } catch { final = null; } }
  const conflictoEnClaude = acciones.some((x) => x.accion === 'CONFLICTO' && /^\.claude\/(hooks|settings)/.test(x.ruta));
  const scriptsOk = ['plan-gate.mjs', 'guard-bash.mjs', 'session-context.mjs', '_lib.mjs'].every((f) => fs.existsSync(path.join(destino, '.claude', 'hooks', f)) || !aplicar);
  const activas = barrerasActivas(final, kitSettings) && scriptsOk && !conflictoEnClaude;
  log(`\nBarreras (hooks) activas tras instalar: ${activas ? 'SÍ' : 'NO — resuelve los conflictos de .claude/ antes de usar Claude Code'}`);
  if (!aplicar) log(cambios ? '\nNo se escribió nada. Si el plan te parece bien, repite el comando agregando --aplicar' : '\nNada que hacer: el kit ya está instalado.');
  return { acciones, advertencias, nota, activas, cambios };
}

// ---------- ejecución ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const pos = args.filter((a) => !a.startsWith('--'));
  if (!pos.length || args.includes('--ayuda')) {
    console.log('Uso: node scripts/install-kit.mjs "<ruta-del-repo>" [--aplicar] [--forzar]\n  sin --aplicar solo simula.\n  --forzar: permite aplicar con cambios sin confirmar en git (no recomendado).');
    process.exit(pos.length ? 0 : 1);
  }
  try {
    const r = instalar(pos[0], { aplicar: args.includes('--aplicar'), forzar: args.includes('--forzar') });
    process.exit(r.activas || !args.includes('--aplicar') ? 0 : 3);
  } catch (e) {
    console.error(`\nERROR: ${e.message}`);
    process.exit(1);
  }
}
