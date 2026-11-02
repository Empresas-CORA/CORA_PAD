---
description: "Cierra una tarea con la lista de verificación P12 (evidencia, regresión, revisión, riesgos, bitácora, commit)."
argument-hint: "<PLAN-NNN> <Tn>"
---
Tarea a cerrar: **$ARGUMENTS**.

Verifica cada punto con evidencia real (no con "debería"). Si alguno falla, la tarea **no** se cierra: dilo y qué falta.

- [ ] Criterios de aceptación cumplidos, con la salida de las pruebas o comandos que lo demuestran.
- [ ] Regresión: lo de tareas anteriores sigue funcionando (resultado de `qa`).
- [ ] Revisión cruzada hecha y sin hallazgos Críticos o Altos abiertos.
- [ ] Todos los cambios están dentro del alcance del plan (`git diff --stat` contra la rama base).
- [ ] No hay secretos en el diff (búsqueda con grep; sin imprimir valores).
- [ ] Riesgos: ¿apareció alguno nuevo o cambió un puntaje? Actualiza el registro por medio del `escriba`.
- [ ] Cambios confirmados en un commit con mensaje claro (`git add` y `git commit`). **No hagas push** ni despliegues: son decisión del humano.

Cuando todo esté en orden:
1. Pide al `escriba` una entrada de bitácora tipo `cambio` con: plan, tarea, qué se hizo, evidencia, archivos, revisiones y pendientes.
2. Reporta al humano en menos de 8 líneas: qué quedó, evidencia clave, commit, y el siguiente paso sugerido. Si procede un push o despliegue, indícalo como punto crítico para su decisión.
