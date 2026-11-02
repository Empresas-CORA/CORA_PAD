# Reglas de este repositorio

Este repositorio se trabaja con protocolos obligatorios y un equipo de agentes. Las reglas aplican a la sesión principal y a **todos** los subagentes. Detalle completo: `docs/protocolos/PROTOCOLOS.md`. Equipo y carriles: `docs/agentes/EQUIPO.md`. Idioma de trabajo: español.

@docs/proyecto/CONTEXTO.md

## Postura
Evalúa críticamente lo que te pidan: dónde falla, dónde podría fallar, alternativas y por qué. No valides por cortesía. Sé breve: informa resultados y decisiones, no el esfuerzo.

## Comprobación de arranque (canario)
Al iniciar la sesión debes ver en tu contexto un mensaje que empieza con `[KIT] Protocolos activos`. Si no aparece, los hooks no están corriendo y las barreras técnicas **no existen**: avisa al humano antes de hacer cualquier otra cosa y no modifiques archivos.

## Protocolos (resumen; son obligatorios)
- **P1 Analizar antes de actuar.** Lee contexto, plan, bitácora y el código afectado antes de proponer o cambiar algo. Separa hechos de hipótesis.
- **P2 No suponer.** Todo dato sin evidencia se marca `[NO VERIFICADO]`. No inventes rutas, versiones ni requisitos.
- **P3 Preguntar.** Si la respuesta cambia el resultado y no está en el proyecto, pregunta (agrupado, con opciones). Sin humano disponible: detente y registra la pregunta.
- **P4 Bitácora.** Todo evento relevante = un archivo nuevo en `docs/bitacora/`. Solo-adición: nunca edites ni borres entradas.
- **P5 Plan primero (NO NEGOCIABLE).** No modifiques código ni configuración sin un plan **aprobado por el humano** (`docs/plans/`). Si no hay plan vigente, usa `/nuevo-plan` y detente. Nunca ejecutes ni intentes simular `scripts/approve-plan.mjs`.
- **P6 Tareas pequeñas.** Atómicas, verificables, reversibles, dentro del alcance del plan. Tras cada una, verifica que lo anterior sigue funcionando.
- **P7 Riesgos.** Registra riesgos con mitigación y reversa en `docs/riesgos/REGISTRO-DE-RIESGOS.md`. Respaldo antes de lo destructivo.
- **P8 Carriles.** Cada agente trabaja en su carril y no edita artefactos ajenos. Solo la sesión principal coordina; los agentes no invocan a otros agentes.
- **P9 Revisión cruzada y reflexión.** Quien produce no aprueba. Todo informe termina con la sección Reflexión.
- **P10 Escalar.** Pide aprobación humana en puntos críticos (plan, producción, DNS, destructivo, gasto, credenciales, stack, gobernanza) y detente ante anomalías. Usa el bloque `ESCALAMIENTO`.
- **P11 Secretos.** Nunca leas, imprimas ni guardes secretos. Nada de credenciales de producción para agentes.
- **P12 Terminado = evidencia.** Sin evidencia ejecutada no está terminado.

## Flujo estándar
1. `/estado` — dónde estamos.
2. `/nuevo-plan <objetivo>` — análisis, preguntas, consulta al equipo, plan en `docs/plans/`.
3. El humano aprueba: `node scripts/approve-plan.mjs docs/plans/PLAN-NNN-slug.md` (en su terminal).
4. `/ejecutar-tarea PLAN-NNN Tn` — una tarea a la vez.
5. `/revision-cruzada` y `/cerrar-tarea`.
6. `/retro` — qué funcionó y qué hay que ajustar en el kit.

## Estructura
- `.claude/agents/` — 11 agentes (CEO, CIO, CTO, CISO, CSO, desarrollador, UX/UI, QA, DevOps, escriba, auditor).
- `.claude/commands/` — comandos del flujo.
- `.claude/hooks/` — barreras que hacen cumplir P4, P5, P8, P10 y P11 (no los modifiques sin aprobación).
- `docs/` — plan, bitácora, riesgos, arquitectura (ADR), infraestructura, protocolos.

## Cómo delegar (sesión principal)
- Al delegar, redacta un encargo autocontenido: objetivo, archivos relevantes, restricciones, criterio de aceptación y formato de salida. Los agentes no ven esta conversación.
- Los agentes de solo lectura (CEO, CIO, CTO, CISO, CSO, auditor) se pueden consultar en paralelo. El código lo escribe una sola vez, un solo agente, por tarea.
- Resume al humano los informes; no pegues informes completos salvo que los pida.
