// PreToolUse (Bash y PowerShell): refuerza P5 (no mutar sin plan), P8 (roles de solo lectura),
// P10 (puntos críticos) y P11 (secretos).
// IMPORTANTE: es una barrera heurística, no un sandbox. La defensa de fondo es la revisión humana, git y CI (ver docs/kit/VALIDACION.md).
import { READONLY_AGENTS, readInput, projectRoot, planStatus, deny, ask, allow } from './_lib.mjs';

const input = readInput();
const root = projectRoot(input);
const agent = input.agent_type || 'main';
const tool = input.tool_name || 'Bash';
const cmd = String((input.tool_input || {}).command || '');
if (!cmd.trim()) allow();

// ---------- 1. Prohibido siempre ----------
const DENY = [
  [/\.claude[\\/]+state/i, 'El estado de aprobación del plan solo lo toca el humano (P5).'],
  [/approve-plan|revoke-plan|install-kit/i, 'Aprobar o revocar planes e instalar el kit lo hace el humano en su propia terminal (P5, P10).'],
  [/--no-verify\b/i, 'No se saltan los controles de git (--no-verify).'],
  [/--dangerously-skip-permissions/i, 'No se desactivan los permisos.'],
  [/(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(sh|bash|zsh|node|python3?)\b/i, 'No se ejecuta código descargado directamente (curl | sh).'],
  [/\b(iwr|irm|invoke-webrequest|invoke-restmethod|curl|wget)\b[^|;&\n]*\|\s*(iex|invoke-expression)\b/i, 'No se ejecuta código descargado directamente (iwr | iex).'],
  [/\b(iex|invoke-expression)\b[^\n]*\b(downloadstring|downloadfile|iwr|irm|invoke-webrequest|invoke-restmethod)\b/i, 'No se ejecuta código descargado directamente (iex + descarga).'],
  [/(^|[\s"'=:\/\\])\.env(?:\.(?!example\b)[\w.-]*)?(?=$|[\s"'|;&)])/i, 'No se leen ni manipulan archivos de secretos (P11).'],
  [/\b(printenv|env)\s*($|[|;&>])/i, 'No se vuelcan variables de entorno (pueden contener secretos, P11).'],
  [/^\s*set\s*($|[|;&>])/i, 'No se vuelcan variables de entorno (pueden contener secretos, P11).'],
  [/\b(get-childitem|gci|get-item|gi|get-content|gc|ls|dir|type|cat)\s+(-path\s+)?env:/i, 'No se vuelcan variables de entorno (P11).'],
  [/\[(system\.)?environment\]::getenvironmentvariable/i, 'No se leen variables de entorno por código (P11).'],
  [/\$env:\w*(key|token|secret|passw|credential)\w*/i, 'No se leen variables de entorno que parecen secretos (P11).'],
];
for (const [re, why] of DENY) if (re.test(cmd)) deny(why);

// ---------- 2. Puntos críticos: decide el humano ----------
const ASK = [
  [/\bgit\s+push\b/i, 'git push (publica cambios).'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard (descarta trabajo).'],
  [/\bgit\s+clean\b/i, 'git clean (borra archivos sin seguimiento).'],
  [/\bgit\s+(branch\s+-D|checkout\s+--\s|restore\b)/i, 'descarta cambios o ramas.'],
  [/\bgh\s+(repo\s+(delete|edit|rename|archive|create)|secret|variable|release|pr\s+merge|workflow\s+run|api)\b/i, 'gh: cambia el repositorio, sus secretos o su visibilidad.'],
  [/\brm\s+(-\w*[rRf]\w*|--recursive|--force)\b/, 'borrado recursivo/forzado.'],
  [/\b(remove-item|ri|del|erase|rd|rmdir)\b[^\n]*(-recurse|-force|\s\/s\b|\s\/q\b)/i, 'borrado recursivo/forzado.'],
  [/\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i, 'sentencia destructiva de base de datos.'],
  [/\bDELETE\s+FROM\b/i, 'DELETE en base de datos.'],
  [/\b(ssh|scp|sftp|rsync)\b/i, 'conexión o transferencia a un servidor (posible producción).'],
  [/\bnpm\s+publish\b/i, 'publicación de paquete.'],
  [/\bsudo\b/i, 'comando con privilegios elevados.'],
  [/start-process\b[^\n]*-verb\s+runas/i, 'elevación de privilegios.'],
  [/\b(chmod|chown)\s+-R\b/i, 'cambio recursivo de permisos.'],
  [/\b(setx|schtasks|set-executionpolicy|new-service|reg\s+(add|delete)|netsh|icacls|takeown|diskpart|format-volume)\b/i, 'cambia la configuración del sistema.'],
  [/\b(winget|choco|scoop)\s+(install|uninstall|upgrade)\b/i, 'instala o cambia software de la máquina.'],
  [/\bdocker\s+(system\s+prune|volume\s+rm|rm)\b/i, 'borrado de recursos Docker.'],
];
for (const [re, why] of ASK) if (re.test(cmd)) ask(`${why} Comando: ${cmd.slice(0, 160)}`);

// ---------- 3. ¿El comando modifica archivos/dependencias? ----------
const stripQuoted = (s) => s.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, '""');

// Cmdlets de PowerShell que modifican; en la herramienta PowerShell se buscan en cualquier parte (if/foreach/ForEach-Object { ... }).
const PS_LONG = /\b(remove-item|set-content|add-content|out-file|clear-content|set-item|set-itemproperty|new-item|copy-item|move-item|rename-item|expand-archive|compress-archive|export-csv|export-clixml|tee-object|install-module|install-package|install-script|invoke-expression|invoke-command|start-process)\b/i;
const IO_CALL = /\[(system\.)?io\.(file|directory|path)\]::(write|append|delete|copy|move|create|replace|set)/i;
// Primer token (incluye alias de PowerShell y comandos de cmd.exe).
const NAME_MUT = /^(tee|mv|cp|rm|rmdir|mkdir|touch|truncate|dd|ln|chmod|chown|install|patch|rename|unlink|shred|remove-item|ri|del|erase|rd|set-content|sc|add-content|ac|out-file|clear-content|set-item|si|set-itemproperty|sp|new-item|ni|copy-item|copy|cpi|move-item|move|mi|rename-item|ren|rni|md|expand-archive|compress-archive|export-csv|export-clixml|tee-object|xcopy|robocopy|attrib|install-module|install-package)$/i;
// Comandos que ejecutan código que no podemos inspeccionar: se tratan como mutación.
const NAME_OPAQUE = /^(iex|invoke-expression|invoke-command|icm|start-process|saps|invoke-item|ii|powershell|pwsh|cmd|bash|sh|zsh|wsl)$/i;

function mutates(command, toolName) {
  const flat = stripQuoted(command);
  if (IO_CALL.test(flat)) return '.NET: escritura de archivos';
  if (toolName === 'PowerShell') {
    const m = flat.match(PS_LONG);
    if (m) return `cmdlet que modifica (${m[1]})`;
  }
  const segments = command.split(/&&|\|\||;|\n|\|/);
  for (const raw of segments) {
    let seg = raw.trim();
    if (!seg) continue;
    // redirecciones (ignorando las inofensivas y el contenido entre comillas)
    const noQuotes = stripQuoted(seg)
      .replace(/\d?>>?\s*\/dev\/null/g, '')
      .replace(/&>\s*\/dev\/null/g, '')
      .replace(/\d?>>?\s*\$null/gi, '')
      .replace(/\d?>>?\s*nul\b/gi, '')
      .replace(/[\d*]?>&\d/g, '');
    if (/>/.test(noQuotes)) return 'redirección a archivo';
    // quitar prefijos: llaves/paréntesis, [void], $x =, & / ., VAR=valor, sudo, time, env
    seg = seg
      .replace(/^[({\s]+/, '')
      .replace(/^\[void\]\s*/i, '')
      .replace(/^\$[\w:.]+\s*[+\-*\/]?=\s*/, '')
      .replace(/^[&.]\s+/, '')
      .replace(/^(\w+=\S+\s+)+/, '')
      .replace(/^(sudo|time|command|exec)\s+/, '');
    const [cmd0, sub0 = ''] = seg.split(/\s+/);
    const name = cmd0.replace(/^["']|["']$/g, '').replace(/^.*[\\/]/, '').replace(/\.(exe|cmd|bat|ps1|com)$/i, '');
    const lname = name.toLowerCase();
    const sub = sub0.toLowerCase();

    if (NAME_MUT.test(lname)) return name;
    if (NAME_OPAQUE.test(lname)) return `${name} (ejecuta código que no se puede inspeccionar)`;
    if (/^(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)$/.test(lname) && /(^|\s)(-o|--output|--output-document|-outfile)\b/i.test(seg)) return `${name} escribiendo a archivo`;
    if (lname === 'sed' && /(^|\s)(-[a-zA-Z]*i|--in-place)/.test(seg)) return 'sed -i';
    if (/^(npm|pnpm|yarn|bun)$/.test(lname) && /^(i|install|add|remove|rm|uninstall|update|up|upgrade|ci|link|dedupe|audit)$/.test(sub) && !(sub === 'audit' && !/\bfix\b/.test(seg))) return `${name} ${sub}`;
    if (/^(pip3?|py|composer|cargo|go|gem|bundle|apt|apt-get|brew)$/.test(lname) && /^(install|add|remove|uninstall|update|upgrade|get|require)$/.test(sub)) return `${name} ${sub}`;
    if (lname === 'git' && /^(add|commit|merge|rebase|cherry-pick|apply|am|stash|checkout|switch|pull|tag|branch|mv|rm|init|clone)$/.test(sub)) {
      // add/commit solo registran lo ya escrito; se permiten sin plan. El resto cambia el árbol de trabajo.
      if (/^(add|commit|branch|tag|stash)$/.test(sub) && !/\bbranch\s+-[dD]/.test(seg)) return null;
      // crear una rama nueva (rama por tarea, P6) no destruye nada
      if (/^(checkout|switch)$/.test(sub) && /(^|\s)(-b|-B|-c)\s+\S+/.test(seg)) return null;
      return `git ${sub}`;
    }
    // intérpretes con código en línea: opacos, se tratan como mutación
    if (/^(node|python3?|py|ruby|perl|php|deno|bun)$/.test(lname) && /(^|\s)(-e|-c|--eval|-p)\b/.test(seg)) return `${name} con código en línea (opaco)`;
  }
  return null;
}

const why = mutates(cmd, tool);
if (!why) allow();

// ---------- 4. Mutación: solo-lectura nunca; el resto exige plan vigente ----------
if (READONLY_AGENTS.has(agent)) {
  deny(`El rol "${agent}" es de solo lectura (P8) y este comando modifica el entorno (${why}).`);
}
const st = planStatus(root);
if (!st.valid) {
  deny(`${st.reason} P5 (NO NEGOCIABLE): este comando modifica el proyecto (${why}). Para documentos usa Write/Edit en docs/; para código crea y aprueba un plan primero.`);
}
// Con plan vigente, un comando que muta Y menciona rutas de gobernanza es un punto crítico (P10): Bash no verifica el alcance archivo por archivo.
const PROTECTED = /(\.claude[\\/]+(hooks|settings|agents|commands|skills|rules)|(^|[\s"'\/\\])claude(\.local)?\.md|docs[\\/]+protocolos|\.git[\\/]+hooks|\.mcp\.json|scripts[\\/]+(approve|revoke)-plan|scripts[\\/]+test-hooks)/i;
if (PROTECTED.test(cmd)) {
  ask(`este comando modifica el proyecto (${why}) y toca la gobernanza del kit (hooks, agentes, protocolos o CLAUDE.md). Comando: ${cmd.slice(0, 160)}`);
}
allow();
