---
description: "Muestra dónde estamos (plan vigente, bitácora reciente, riesgos abiertos, siguiente paso)."
---
Solo lectura. No modifiques nada.

1. Lee `.claude/state/approved-plan.json` si existe. Indica el plan vigente y si su aprobación sigue válida (el hook `session-context` ya calcula esto; confírmalo leyendo el plan).
2. Lista `docs/plans/` y resume el estado de cada plan (borrador o aprobado).
3. Lee las 5 entradas más recientes de `docs/bitacora/` (ordenadas por nombre) y localiza el `checkpoint` más reciente, si hay.
4. Lee `docs/riesgos/REGISTRO-DE-RIESGOS.md` y cuenta los riesgos abiertos con puntaje ≥ 6.
5. Revisa `docs/proyecto/CONTEXTO.md`: cuenta cuántos `[POR DEFINIR]` quedan.

Responde en menos de 15 líneas:
- **Plan vigente:** (id o "ninguno")
- **Última actividad:** (1-2 líneas de la bitácora)
- **Último checkpoint:** (tarea y siguiente paso, o "ninguno"; si hubo un corte, sugiere `/retomar`)
- **Riesgos que requieren atención:**
- **Desconocidos pendientes:** (cantidad y los 3 más importantes)
- **Siguiente paso recomendado:** (un solo paso concreto)

Si algo es inconsistente (por ejemplo, el plan cambió tras su aprobación), dilo primero.
