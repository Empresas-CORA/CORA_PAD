---
fecha: 2026-11-01T22:34:04-06:00
autor: claude (sesión principal)
tipo: hallazgo
---

# Validación del kit en Claude Code real: V1, V2, V3, V4, V11 y V15

**Qué se hizo / qué ocurrió:**
Sesión de validación de `docs/kit/VALIDACION.md` en VS Code, Windows 11, Claude Code 2.1.310 (versión indicada por el humano; no verificada por Claude). Sin plan vigente. Resultados:
- **V1** (hooks listados): SessionStart, `Write|Edit|MultiEdit|NotebookEdit` y `Bash|PowerShell`. Resultado informado por el humano.
- **V2** (arranque y canario): la sesión recibió `[KIT] Protocolos activos` y `[KIT] Sin plan vigente`.
- **V3**: Write de `src/hola.js` bloqueado por `plan-gate.mjs` (P5). Dos intentos, mismo resultado.
- **V4**: Bash `echo hola > src/x.txt` bloqueado por `guard-bash.mjs` ("redirección a archivo"). Dos intentos.
- **V15**: PowerShell `Set-Content -Path src/a.js ...` bloqueado por `guard-bash.mjs` ("cmdlet que modifica (Set-Content)").
- **V11**: `echo hola` se ejecutó sin confirmación; `echo "git push"` pidió confirmación y el humano la rechazó. Antes, `git push --dry-run` fue rechazado dos veces por el humano. El hook `ask` interviene, pero el cuadro de confirmación no muestra el motivo del kit.

**Por qué:**
Las barreras solo se habían probado en simulación (143 casos). Hacía falta comprobarlas en Claude Code real (ver fila "V0-V16 pendiente" de `docs/kit/REGISTRO-KIT.md`).

**Archivos o recursos tocados:**
- `docs/kit/REGISTRO-KIT.md` (6 filas añadidas al final)
- `docs/bitacora/2026-11-01_2234_claude_validacion-kit-v1-v15.md` (esta entrada)
- Los archivos de prueba (`src/hola.js`, `src/x.txt`, `src/a.js`) no deberían existir; no se verificó en disco.

**Resultado y evidencia** (salida de pruebas, comando, enlace):
Mensajes de hook citados en la conversación, p. ej. `PreToolUse:Write hook error: [node ${CLAUDE_PROJECT_DIR}/.claude/hooks/plan-gate.mjs]: [KIT] BLOQUEADO: No existe un plan aprobado ... P5 (NO NEGOCIABLE)`.

**Pendientes / siguiente paso:**
- Siguen sin probarse V5-V10, V12-V14 y V16 (esta última descarta que un bloqueo venga de otra causa y confirma `onFailure`).
- V11 se probó con `echo "git push"`, no con `git push` ni `Remove-Item -Recurse -Force`, como pide VALIDACION. No quedó confirmado qué mostraría el cuadro para esos comandos.
- La fila "V0-V16 pendiente" del registro sigue abierta.

**Preguntas abiertas:**
- Hipótesis no verificada: `echo "git push"` pidió confirmación porque el patrón de `ask` encuentra el texto `git push` dentro de una cadena entrecomillada (falso positivo de la heurística de `guard-bash`). No se probó con el código del hook.
- ¿Debe el cuadro de confirmación mostrar el motivo del kit? Hoy no lo hace.

**Riesgos nuevos o actualizados:**
Ninguno registrado en `docs/riesgos/REGISTRO-DE-RIESGOS.md` (no se tocó).

> Nombre del archivo: `AAAA-MM-DD_HHMM_<autor>_<slug>.md`. Cada entrada es un archivo nuevo. No se edita ni se borra.
