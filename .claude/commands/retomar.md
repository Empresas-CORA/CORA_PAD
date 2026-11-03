---
description: "Retoma el trabajo tras un corte, una conversación nueva o una compactación: lee el estado, lo contrasta con git y propone el siguiente paso. Solo lectura."
argument-hint: "[PLAN-NNN Tn]"
---
Solo lectura. No modifiques nada hasta que el humano confirme el siguiente paso (P13). Tarea indicada (opcional): **$ARGUMENTS**.

1. **Plan:** lee `.claude/state/approved-plan.json` si existe y el plan vigente en `docs/plans/`. Indica si la aprobación sigue válida.
2. **Bitácora:** localiza el `checkpoint` más reciente (`docs/bitacora/*checkpoint*`, ordenado por nombre) y lee las 5 entradas más recientes. Fíjate en lo ocurrido después del checkpoint (cierres, incidentes, decisiones).
3. **Repositorio:** ejecuta `git status --short`, `git log --oneline -5` y `git diff --stat`, y nota la rama actual. Compara con el checkpoint: ¿coinciden la rama y el último commit? ¿hay cambios sin confirmar que el checkpoint no menciona?
4. **Verificación:** si el plan o el checkpoint indican cómo verificar la tarea y es de solo lectura (pruebas, linter), ejecútala. Si exigiría modificar algo, no la ejecutes y dilo.
5. **Informe** (menos de 20 líneas):
   - **Plan y tarea:**
   - **Hecho y verificado:**
   - **Hecho sin verificar:**
   - **No iniciado:**
   - **Discrepancias** (bitácora, git y plan):
   - **Preguntas abiertas:**
   - **Siguiente paso propuesto:** (uno solo, concreto)

Reglas: si la bitácora y el repositorio discrepan, **manda el repositorio** y pregunta antes de seguir (P3). No rehagas lo ya verificado y no repitas acciones destructivas. Si no hay plan vigente ni checkpoint, dilo y propone `/estado` o `/nuevo-plan`.
