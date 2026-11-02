# Kit de protocolos y agentes para Claude Code

Versión 0.2.1 (endurecida para Windows, con instalador seguro para repos existentes). Base reutilizable para cualquier proyecto: 12 protocolos obligatorios, 11 agentes con carriles aislados, comandos de flujo y *hooks* que hacen cumplir las reglas más importantes (sobre todo: **no se toca código sin un plan aprobado por un humano**).

## Requisitos
- Claude Code **2.1.295 o superior**. En la **extensión de VS Code** el número de versión de la extensión *es* la versión de Claude Code que trae (pestaña Extensions de VS Code), y `/status` en el panel también la muestra. La app de escritorio y la extensión usan el mismo motor que la terminal y comparten `CLAUDE.md`, hooks, agentes y comandos. En terminal: `claude --version`.
- Node.js 18 o superior (los hooks y scripts lo usan; no hay dependencias). En Windows, tras instalarlo abre una terminal nueva.
- Git. En Windows, se recomienda Git for Windows.
- Windows 11: el kit cubre las herramientas Bash y PowerShell de Claude Code.

## Instalación
**El kit no se despliega en Hostinger.** Vive en el repositorio de cada producto y lo usa Claude Code en tu computadora. A Hostinger solo llega el código de la aplicación.

**A. En un repositorio que ya existe (lo normal): usa el instalador.** No sobrescribe nada tuyo.
1. `git status` limpio y una rama nueva: `git switch -c chore/instalar-kit`.
2. Desde la carpeta del kit: `node scripts/install-kit.mjs "C:\ruta\al\repo"` (**simula**, no escribe; léelo).
3. Si te parece bien, repite agregando `--aplicar`.
4. En el repo: `git diff`, `node scripts/test-hooks.mjs` (`143 OK, 0 con FALLA`) y haz commit tú.

**B. En un repositorio nuevo y vacío (el caso de `CORA_PAD`):** no hace falta el instalador. El zip trae los archivos **directamente en la raíz** (sin carpeta superior); extráelo con la ruta de la carpeta del repo como destino:
```powershell
Expand-Archive "$HOME\Downloads\kit-agentes.zip" "C:\ruta\a\CORA_PAD"
```
Comprueba que existe `C:\ruta\a\CORA_PAD\.claude\settings.json` (si quedó dentro de otra carpeta, los hooks **no** funcionan). Luego `git init -b main` si aún no es repositorio. Si el repo será la **fuente** del kit para otros proyectos, conserva `scripts/install-kit.mjs` y `scripts/test-install.mjs`.

Después, en ambos casos:
5. **Abre la carpeta del repo en VS Code (o en la app de escritorio) después de copiar el kit** y abre una conversación nueva de Claude Code; acepta la confianza de la carpeta. Si ya estaba abierta, ciérrala y vuelve a abrirla: Claude Code carga `.claude/agents/` al iniciar.
6. Sigue `docs/kit/VALIDACION.md` (V0-V17). **El kit aún no se ha probado en Claude Code real ni en un Windows real.**
7. Completa `docs/proyecto/CONTEXTO.md` (todo lo que diga `[POR DEFINIR]`).

Antes de instalar en repos reales, `node scripts/test-install.mjs` debe terminar con `60 OK, 0 con FALLA`.

## Flujo de trabajo
```
/estado  →  /nuevo-plan "objetivo"  →  (tú) node scripts/approve-plan.mjs docs/plans/PLAN-NNN-….md
         →  /ejecutar-tarea PLAN-NNN T1  →  /revision-cruzada  →  /cerrar-tarea  →  /retro
```
Aprobar un plan lo haces **tú, en tu propia terminal**. Los agentes no pueden hacerlo.

## Qué hay aquí
| Ruta | Para qué |
|---|---|
| `CLAUDE.md` | Reglas compactas que Claude Code carga siempre |
| `docs/protocolos/PROTOCOLOS.md` | Los 12 protocolos en detalle |
| `docs/agentes/EQUIPO.md` | Roster, carriles, matriz de responsabilidades, formato de informe |
| `.claude/agents/` | CEO, CIO, CTO, CISO, CSO, desarrollador, UX/UI, QA, DevOps, escriba, auditor |
| `.claude/commands/` | `/estado`, `/nuevo-plan`, `/ejecutar-tarea`, `/revision-cruzada`, `/cerrar-tarea`, `/retro` |
| `.claude/hooks/` | Barreras: plan aprobado, alcance, bitácora solo-adición, roles, puntos críticos, secretos |
| `scripts/` | `approve-plan`, `revoke-plan` (humano) y `test-hooks` (verificación). `install-kit` y `test-install` existen solo en la carpeta del kit, no se copian a los repos |
| `docs/plans/`, `docs/bitacora/`, `docs/riesgos/` | Plan, bitácora y registro de riesgos |
| `docs/arquitectura/` | ADR. `ADR-0001-stack.md` está pendiente de decisión |
| `docs/infraestructura/HOSTINGER.md` | Inventario y fases del servidor y dominio |
| `docs/kit/` | Validación y registro de si el kit funciona |

## Usar el kit en proyectos nuevos
Conserva esta carpeta como repositorio plantilla (en GitHub: *Template repository*) y crea cada proyecto desde ella. Lo específico de cada proyecto vive solo en `docs/proyecto/CONTEXTO.md` y en sus ADR; el kit no cambia.

## Límites que debes conocer
Los hooks son barreras fuertes, no un sandbox. Lee "Límites conocidos" en `docs/kit/VALIDACION.md`. La defensa de fondo es git, revisión humana del diff y, con repositorio remoto, ramas protegidas.

## Modificar el kit
Cambiar protocolos, agentes, hooks o `CLAUDE.md` es un punto crítico: Claude pedirá tu confirmación. Registra cada cambio en `docs/kit/REGISTRO-KIT.md`.
