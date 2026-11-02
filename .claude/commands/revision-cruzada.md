---
description: "Revisión cruzada independiente del cambio actual (quien produce no aprueba, P9)."
argument-hint: "[tarea, rama o archivos; por defecto el diff actual]"
---
Alcance de la revisión: **$ARGUMENTS** (si está vacío, el diff actual contra la rama base: `git diff`).

1. Determina el tipo de cambio y elige revisores (no invoques a quien implementó el cambio como revisor de sí mismo):
   - Código de aplicación: `cto` + `ciso` + `qa`
   - Interfaz: `ux-ui` (como revisor, si no fue quien lo hizo) + `qa` + `ciso`
   - Infraestructura, despliegue o configuración: `cso` + `cto` + `devops`
   - Datos o integraciones: `cio` + `ciso`
   Respeta lo que pida el plan en "Revisiones requeridas".
2. Invoca a los revisores **en paralelo** con un encargo autocontenido: el diff o archivos, el criterio de aceptación, el plan y el formato de informe. Los de solo lectura no pueden modificar nada.
3. Con los informes en mano, invoca al `auditor` para revisar el proceso y buscar puntos ciegos.
4. Consolida en una tabla:

| Revisor | Veredicto | Hallazgos Críticos/Altos | Condiciones |
|---|---|---|---|

5. Reglas de decisión:
   - Cualquier `RECHAZA` con hallazgo Crítico o Alto: la tarea **no** se cierra. Se corrige y se vuelve a revisar.
   - `APRUEBA CON CONDICIONES`: las condiciones pasan a ser tareas o se justifica por qué no.
   - **Desacuerdo entre revisores:** documenta ambas posturas con evidencia y escala al humano. Ningún agente "gana" por insistencia.
6. Pide al `escriba` que registre la revisión en la bitácora (tipo `hallazgo` o `decision`).

Entrega al humano la tabla y las decisiones que le tocan, nada más.
