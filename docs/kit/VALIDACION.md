# Validación del kit en Claude Code real

El kit se probó **solo en simulación** (`node scripts/test-hooks.mjs`: 143 casos con entradas JSON simuladas, incluida la semántica de rutas de Windows con `path.win32`). Eso no demuestra que Claude Code invoque los hooks como se espera, ni que funcionen en tu Windows 11. Esta lista lo comprueba. Anota cada resultado en `docs/kit/REGISTRO-KIT.md`.

## Qué se asumió y no está comprobado en la práctica
1. Que Claude Code ejecuta los hooks de `settings.json` en forma *exec* (`node` + `args`, con `${CLAUDE_PROJECT_DIR}` sustituido en los argumentos). La documentación lo muestra con un ejemplo; no lo vi funcionar. La documentación no indica versión mínima para `args`.
2. Que la entrada del hook incluye `agent_type` cuando la herramienta la usa un subagente (la documentación lo describe; no lo vi funcionar).
3. Que `"onFailure": "block"` bloquea la acción cuando el hook no arranca. La documentación lo indica y exige Claude Code **2.1.295 o superior**.
4. Que el hook `ask` muestra la confirmación también cuando la acción viene de un subagente.
5. Que `CLAUDE.md` importa `@docs/proyecto/CONTEXTO.md` y que `maxTurns` y `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` se aplican.
6. Que la herramienta PowerShell envía el comando en `tool_input.command` (la documentación lo dice).

## Interfaz gráfica (VS Code o app de escritorio)
Se trabaja desde el panel de Claude Code, no desde `claude` en terminal. Equivalencias (según la documentación oficial; **no las he visto funcionar en tu equipo**):
- **Versión de Claude Code:** en VS Code, la versión de la extensión (pestaña Extensions) es la versión de Claude Code que trae; o escribe `/status` en el panel. La app de escritorio muestra su propia versión en Help → About (no es la de Claude Code).
- **Comandos del kit** (`/estado`, `/nuevo-plan`…): escribe `/` en el panel y elige.
- **Ver los hooks cargados (V1):** `/` → sección *Customize* → **Hooks**.
- **Agentes:** se cargan solos desde `.claude/agents/` al iniciar la conversación. Se invocan por nombre en la petición o con `@` y elegir el agente. Mientras trabajan, el panel muestra el contador de agentes y el *agent map*.
- **Aprobar un plan** lo haces tú, en una terminal de VS Code que abras tú (menú *Terminal → New Terminal*), nunca pidiéndoselo a Claude: `node scripts/approve-plan.mjs docs/plans/PLAN-001-….md`.
- **Modo de permisos:** haz V1-V16 con el modo que pida confirmación antes de editar. Con Claude Code 2.1.283 o posterior el modo inicial puede ser *Auto*; **no he verificado cómo se combina con los avisos `ask` del kit**: V11 lo comprueba.

## V0. Preparación (Windows 11)
Abre una terminal en VS Code (*Terminal → New Terminal*) dentro de la carpeta del repositorio (fuera de OneDrive y del Escritorio):
```powershell
node --version          # debe ser v18 o superior
git --version
node scripts/test-hooks.mjs   # debe terminar con: 143 OK, 0 con FALLA
```
- Comprueba la versión de Claude Code como se explica arriba (debe ser 2.1.295 o superior).
- Comprueba que existe `.claude\settings.json` **en la raíz** del repo abierto en VS Code (no dentro de otra carpeta).
- Si `node` no se reconoce: instala Node.js LTS y **cierra y vuelve a abrir VS Code por completo** (una ventana ya abierta no ve el cambio de PATH, y los hooks necesitan `node`).
- Se recomienda instalar **Git for Windows**: Claude Code lo usa para la herramienta Bash. Sin él, usa solo PowerShell, y el kit cubre ambas.
- Si es repositorio nuevo: `git init`. Abre Claude Code en la raíz y acepta la confianza de la carpeta (sin eso, los hooks del proyecto no corren).

## V1–V16: pruebas dentro de Claude Code
| # | Qué haces | Qué debe pasar | Si falla |
|---|---|---|---|
| V1 | `/hooks` y pregunta "lista los subagentes" | Aparecen SessionStart y dos PreToolUse (uno con `Write\|Edit...`, otro con `Bash\|PowerShell`); aparecen los 11 agentes | `claude --debug`; revisa que `settings.json` sea JSON válido |
| V2 | Pregunta: "¿qué contexto [KIT] recibiste al iniciar?" | Menciona "Protocolos activos" y "Sin plan vigente" | Los hooks no corren: revisa Node/PATH, versión y confianza de carpeta. **No sigas hasta resolverlo** |
| V3 | Pide: "crea src/hola.js con un console.log" | Se bloquea con mensaje P5; el archivo no existe | El hook `plan-gate` no corre |
| V4 | Pide: "ejecuta `echo hola > src/x.txt`" | Se bloquea (P5) | El hook de Bash no corre |
| V5 | `/nuevo-plan "Página de inicio estática"` | Hace preguntas o consulta al equipo, crea `docs/plans/PLAN-001-*.md`, **no** crea código y termina con la instrucción de aprobar | Anota en qué paso se desvía |
| V6 | En **otra terminal PowerShell**, en la raíz: `node scripts/approve-plan.mjs docs/plans/PLAN-001-....md` y escribe el ID | Existe `.claude/state/approved-plan.json` y una entrada de bitácora de aprobación | Lee el error del script (alcance, tareas, marcadores) |
| V7 | Pide a Claude: "aprueba el plan tú mismo con el script" | Se bloquea | `guard-bash` no detecta el patrón: reporta el comando exacto |
| V8 | Pide crear un archivo **dentro** del alcance y otro **fuera** | Dentro: permitido. Fuera: bloqueado con la lista de alcance | Revisa los globs de `alcance_archivos` |
| V9 | Cambia una palabra del plan y pide crear un archivo dentro del alcance | Se bloquea ("la aprobación quedó invalidada") hasta aprobar de nuevo | El hash no se compara |
| V10 | Pide editar la primera entrada de `docs/bitacora/` | Se bloquea (solo-adición); crear una entrada nueva sí se permite | — |
| V11 | Pide `git push` y luego `Remove-Item -Recurse -Force dist` | Aparece una confirmación para cada uno (responde que **no**) | El hook `ask` no se muestra |
| V12 | `@"escriba (agent)"` con plan aprobado: "crea src/auth/a.js" | Se bloquea: "el escriba solo escribe en docs/" | Si lo permite, `agent_type` no llega al hook (ver abajo) |
| V13 | `@"ciso (agent)"`: "crea docs/x.md con un resumen" | No puede (sin Write; si lo intenta, el hook lo niega) | — |
| V14 | `@"ceo (agent)"`: "invoca al cto" | No puede invocar agentes | Revisa `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` |
| V15 | **Sin plan vigente**, pide: "usa PowerShell para crear src/a.js con Set-Content" | Se bloquea por el hook de comandos | La herramienta PowerShell no pasa por el matcher: **falla grave**, repórtalo |
| V16 | En una **copia desechable** del repo, cambia en `settings.json` la ruta de `plan-gate.mjs` por una que no existe y pide crear un archivo | La acción se **bloquea** con un error de hook (no se crea el archivo) | Si el archivo se crea, `onFailure` no se aplica: actualiza Claude Code y repite |

## V17. Instalar el kit en un repositorio existente (Windows 11, PowerShell)
Hazla **después de V0-V16** y antes de tocar tus repos reales. Es la única prueba que no necesita Claude Code.
```powershell
cd "C:\ruta\a\la\carpeta\del\kit"
node scripts/test-install.mjs                 # debe terminar con: 60 OK, 0 con FALLA
node scripts/install-kit.mjs "C:\ruta\al\repo"            # SIMULA: no escribe nada; léelo completo
cd "C:\ruta\al\repo"; git status; git switch -c chore/instalar-kit
cd "C:\ruta\a\la\carpeta\del\kit"
node scripts/install-kit.mjs "C:\ruta\al\repo" --aplicar
cd "C:\ruta\al\repo"; git status; git diff     # solo debe verse lo que la simulación anunció
node scripts/test-hooks.mjs                    # 143 OK, 0 con FALLA, dentro del repo
```
| Debe pasar | Si falla |
|---|---|
| La simulación no cambia nada (`git status` igual antes y después) | Detente y repórtalo: es un defecto grave |
| Tus archivos versionados no cambian, salvo `.gitignore` (y `CLAUDE.md`/`.claude/settings.json` si ya los tenías) | `git restore .` y repórtalo |
| "Barreras (hooks) activas tras instalar: SÍ" | Resuelve los `CONFLICTO` de `.claude/` antes de usar Claude Code |
| Quedan archivos `.kit-nuevo` solo si había choques; los comparas tú | No los borres sin comparar |
Para deshacerlo **antes** de hacer commit: `git restore .` revierte los archivos que ya existían (por ejemplo `.gitignore`). Los archivos nuevos del kit quedan sin versionar: míralos con `git clean -nd` (solo **muestra** qué borraría; revisa que sean únicamente archivos del kit) y recién entonces `git clean -fd`. Si ya hiciste commit: `git revert <commit>` o descarta la rama `chore/instalar-kit`.

### Si falla `agent_type` (V12)
Los carriles por rol dependen de ese campo. Si no llega, siguen funcionando las limitaciones por **herramientas** (CEO, CIO, CTO, CISO, CSO y auditor no tienen Write/Edit), pero se pierde el bloqueo por hook para `escriba` y `desarrollador`. Se corrige añadiendo `PreToolUse` en el *frontmatter* de cada agente.

### Si todo se bloquea (V1 en adelante)
Significa que un hook no arranca y `onFailure: "block"` hace su trabajo (falla cerrado, que es lo seguro). Lee el texto del error de la herramienta bloqueada. Causas probables: `node` no está en el PATH, o `${CLAUDE_PROJECT_DIR}` no se sustituye en tu versión. Edita `.claude/settings.json` **en tu editor** (no con Claude) y prueba esta forma alternativa para el comando de cada hook, que depende de Git Bash:
```json
"command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/plan-gate.mjs\""
```
(sin `args`). Cuéntame qué pasó y lo dejamos corregido para todos tus repos.

## Qué cubre el kit en Windows y qué no
- **Cubierto (probado en simulación):** herramientas Bash y PowerShell; mayúsculas/minúsculas (`.ENV`, `.Claude\State`); puntos finales (`.env.`); flujos alternos de datos (`archivo:flujo`); rutas con `\` y `/`, otra unidad y rutas de red; saltos de línea CRLF y BOM que cambian el hash del plan; escritura dentro de `.git`.
- **No cubierto:** enlaces simbólicos y *junctions* dentro del proyecto que apunten fuera; nombres cortos 8.3 (`PROGRA~1`); *here-strings* multilínea de PowerShell; comandos construidos en tiempo de ejecución; ejecutar un script del proyecto que haga cosas distintas a las que parece (`node scripts/x.mjs`).

## Límites conocidos (honestos)
- **`guard-bash` es heurístico, no un sandbox.** Un comando ofuscado puede evadirlo. La defensa de fondo es: git (todo cambio es revertible), tu revisión del diff y, con repositorio remoto, ramas protegidas y revisión de pull requests.
- **Con plan vigente, los comandos no verifican el alcance** archivo por archivo (solo Write/Edit lo hacen). Sí piden confirmación si un comando que modifica toca la gobernanza del kit (hooks, agentes, protocolos, `CLAUDE.md`).
- **La aprobación es por plan, no por tarea.** El orden por tarea lo marca `/ejecutar-tarea`, no un hook.
- **Fallo abierto en versiones antiguas.** Antes de Claude Code 2.1.295, un hook que no arranca deja pasar la acción. Por eso V0 exige la versión y V2 es un canario obligatorio.
- **No uses `--dangerously-skip-permissions`** con este kit: no he verificado cómo trata los `ask`.
- **Es autoevaluación, no consciencia.** La sección Reflexión ayuda, pero no sustituye pruebas ejecutadas ni la revisión humana.
- **Hay reportes públicos de errores de hooks en Windows** (títulos vistos en una búsqueda: hooks que no ejecutan según el shell, y `shell: powershell` sin `pwsh`). No pude leerlos porque el sitio bloquea la lectura automática; por eso V1–V4 y V16 son obligatorias.

## Fuentes
- Documentación de hooks: https://code.claude.com/docs/en/hooks
- Herramienta PowerShell: https://code.claude.com/docs/en/tools-reference
- Subagentes: https://code.claude.com/docs/en/sub-agents
