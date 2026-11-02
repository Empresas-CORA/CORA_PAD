---
description: "Crea un plan de desarrollo (P5) sin tocar código: análisis, preguntas, consulta al equipo y plan listo para aprobación humana."
argument-hint: "<objetivo en una frase>"
---
Objetivo recibido: **$ARGUMENTS**

Esto es el protocolo P5. **No modifiques código ni configuración.** Solo puedes escribir en `docs/`.

## Pasos
1. **Analizar (P1).** Lee `docs/proyecto/CONTEXTO.md`, `docs/infraestructura/HOSTINGER.md`, `docs/arquitectura/`, el registro de riesgos, las últimas entradas de bitácora y el código que probablemente se vería afectado. Separa hechos de hipótesis.
2. **Preguntar (P2, P3).** Haz una lista de lo que no se puede saber leyendo el proyecto. Si cambia el resultado, pregunta al humano ahora (agrupado, con opciones y tu recomendación; máximo 5) y espera. No sigas con suposiciones.
3. **Consultar al equipo, en paralelo y solo lectura.** Invoca en un mismo mensaje a los agentes que apliquen: `ceo` (siempre), `cto` (siempre), `ciso` (si hay datos, usuarios o código expuesto), `cso` (si toca entornos, dominio o despliegue), `cio` (si hay datos, integraciones o proveedores). A cada uno dale un encargo autocontenido: objetivo, hechos verificados, restricciones, preguntas concretas y el formato de informe de `docs/agentes/EQUIPO.md`. No les pases secretos.
4. **Redactar el plan.** Lee `docs/plans/_PLANTILLA.md` y crea `docs/plans/PLAN-NNN-slug.md` con la herramienta Write (NNN = siguiente número consecutivo; no uses `cp` ni redirecciones de Bash). Llena todas las secciones:
   - Tareas pequeñas, atómicas, verificables y reversibles (P6), con criterio de aceptación, verificación y reversa.
   - `alcance_archivos` **acotado** a lo mínimo necesario.
   - Riesgos con mitigación y contingencia (P7), y los puntos críticos donde se pedirá aprobación (P10).
   - Resume las conclusiones del equipo en la sección 10 y lleva los riesgos nuevos al registro.
   - No dejes `[POR DEFINIR]` ni `[PENDIENTE]` en el plan: `approve-plan` los rechaza.
5. **Auditar.** Invoca al `auditor` con el plan y los informes. Incorpora sus observaciones o explica por qué no.
6. **Registrar (P4).** Invoca al `escriba` con los insumos (objetivo, decisiones, consultas, riesgos nuevos) para que cree la entrada de bitácora.

## Cierre
Entrega al humano, en este orden:
1. Resumen del plan en menos de 10 líneas (objetivo, número de tareas, alcance, riesgos principales).
2. Decisiones que solo el humano puede tomar y las opciones.
3. Desacuerdos entre agentes, si los hubo (ambas posturas con evidencia).
4. La instrucción de aprobación, tal cual: `node scripts/approve-plan.mjs docs/plans/PLAN-NNN-slug.md`

Después **detente**. No ejecutes ese script, no lo simules, no empieces tareas. Tampoco existe "aprobación implícita".
