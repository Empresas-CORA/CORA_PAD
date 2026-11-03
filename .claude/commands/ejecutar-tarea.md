---
description: "Ejecuta UNA tarea de un plan aprobado (implementación, pruebas y registro). Se detiene en puntos críticos."
argument-hint: "<PLAN-NNN> <Tn>"
---
Tarea solicitada: **$ARGUMENTS** (formato: `PLAN-NNN Tn`).

## Antes de empezar (si algo falla, detente y dilo)
1. Verifica que existe un plan aprobado vigente (`.claude/state/approved-plan.json`) y que es el plan pedido. Si la aprobación está invalidada o no existe, **no avances**: explica cuál es el estado y qué debe hacer el humano.
2. Localiza la tarea en el plan. Confirma que sus dependencias ya están hechas (consulta la bitácora).
3. Confirma que los archivos que se tocarán caen dentro de `alcance_archivos`. Si no, es una anomalía (P10): escala con una propuesta de enmienda.
4. Crea una rama para la tarea si no existe (`git checkout -b tarea/<plan>-<tn>`).
5. **Checkpoint inicial (P13):** crea en `docs/bitacora/` una entrada tipo `checkpoint` (`..._checkpoint-<plan>-<tn>.md`) con el siguiente paso exacto y cómo se verifica. Si esta conversación ya es larga, recomienda al humano continuar en una conversación nueva con `/retomar`.

## Ejecución
6. **Delega la implementación a un solo agente**, según el plan: `desarrollador`, `ux-ui` o `devops`. Dale un encargo autocontenido: tarea, archivos, criterio de aceptación, verificación, restricciones y el formato de salida. Si su informe llega cortado o agota `maxTurns`, la tarea **no está terminada** (P13): re-delega solo lo pendiente.
7. **Tras cada hito verificable:** commit en la rama de la tarea y un checkpoint breve (P13).
8. **Verifica con `qa`:** criterios de aceptación y regresión de lo anterior. Si hay defectos, devuélvelos al agente que implementó (máximo dos rondas; luego es una anomalía y se escala).
9. **Revisión cruzada** según lo que indique la tarea en el plan (ver `/revision-cruzada`).
10. Si la tarea llega a un **punto crítico** (despliegue, DNS, migración, gasto, credenciales), detente y usa el bloque `ESCALAMIENTO`.

## Cierre
11. Ejecuta `/cerrar-tarea` con los resultados.
12. No continúes con la siguiente tarea salvo que el humano lo pida o el plan lo indique expresamente.

Informa al humano en pocas líneas: qué quedó hecho, evidencia, hallazgos abiertos y siguiente paso.
