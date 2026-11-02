# Equipo de agentes

Los agentes son subagentes de Claude Code definidos en `.claude/agents/*.md`. Cada uno corre en su **propio contexto**, con **herramientas limitadas** y un **carril** fijo. La sesión principal los coordina con los comandos de `.claude/commands/`.

## Cómo se logra "aislados pero comunicados"
| Idea | Cómo se implementa |
|---|---|
| Nadie interviene en el trabajo de otro | Herramientas mínimas por rol; los roles de dirección y el auditor son **solo lectura**; los hooks bloquean escrituras fuera del carril (`agent_type`); nadie edita artefactos ajenos (P8) |
| Todos saben qué hace cada uno | Plan, bitácora, informes y registro de riesgos: todo en archivos compartidos del repo |
| Nadie invoca a otro agente | Ningún agente tiene la herramienta `Agent`; además `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` en `settings.json`. Solo la sesión principal coordina |
| Metacognición | Sección **Reflexión** obligatoria en cada informe + auditor independiente + `/retro` (P9) |
| Pedir permiso solo en lo crítico | P10: lista cerrada de puntos críticos y anomalías; el resto avanza solo |

> **Nota de versión.** Según la documentación actual de Claude Code, por defecto un subagente *sí puede* crear subagentes (hasta 3 niveles). Este kit lo desactiva a propósito para que el flujo sea auditable.

## Roster
| Agente | Carril (decide / evalúa) | Herramientas | Escribe |
|---|---|---|---|
| `ceo` | Objetivo, alcance, prioridades, valor vs. esfuerzo | Read, Grep, Glob | No |
| `cio` | Datos, modelo de datos, integraciones, proveedores, costos, privacidad | Read, Grep, Glob, WebSearch, WebFetch | No |
| `cto` | Arquitectura, stack, estándares, dependencias, ADR, deuda técnica | Read, Grep, Glob, WebSearch, WebFetch | No |
| `ciso` | Seguridad de aplicación y datos: amenazas, OWASP, autenticación, dependencias, secretos | Read, Grep, Glob, WebSearch, WebFetch, Bash (solo lectura) | No |
| `cso` | Seguridad del entorno y continuidad: servidor, red, DNS, TLS, accesos, respaldos, incidentes | Read, Grep, Glob, WebSearch, WebFetch, Bash (solo lectura) | No |
| `desarrollador` | Implementa **una** tarea aprobada, con pruebas, dentro del alcance del plan | Read, Grep, Glob, Edit, Write, Bash | Código dentro del alcance |
| `ux-ui` | Interfaz, accesibilidad, responsive, textos de interfaz | Read, Grep, Glob, Edit, Write, Bash | Capa de presentación dentro del alcance |
| `qa` | Verifica criterios de aceptación; pruebas y regresión; reporta defectos | Read, Grep, Glob, Edit, Write, Bash | Archivos de prueba dentro del alcance |
| `devops` | Build, CI/CD, entornos, runbooks y scripts de despliegue (nunca producción) | Read, Grep, Glob, Edit, Write, Bash | Config/scripts dentro del alcance |
| `escriba` | Bitácora, ADR, actas y documentación a partir de insumos | Read, Grep, Glob, Edit, Write | Solo `docs/` |
| `auditor` | Revisa el **proceso** y las decisiones; busca puntos ciegos | Read, Grep, Glob, Bash (solo lectura) | No |

**CSO y CISO.** Se solapan en el nombre pero no en el carril. CISO = seguridad **del software y de los datos**. CSO = seguridad **del entorno donde corre** y de la continuidad. Reparto confirmado por el humano el 2026-11-01; si cambia, se actualiza aquí y en sus archivos.

## Matriz de responsabilidades (quién hace qué)
R = ejecuta · A = aprueba (humano en lo crítico) · C = consultado (informe) · I = informado

| Actividad | Humano | Coord. (sesión) | CEO | CIO | CTO | CISO | CSO | Dev | UX | QA | DevOps | Escriba | Auditor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Definir objetivo y alcance | A | R | C | C | C | C | C | | | | | I | |
| Redactar plan | A | R | C | C | C | C | C | | | | | I | C |
| Aprobar plan | **A/R** | I | I | I | I | I | I | | | | | I | I |
| Elegir stack (ADR) | A | R | C | C | C | C | C | | | | | R | C |
| Implementar tarea | | I | | | | | | **R** | R | | R | I | |
| Probar tarea | | I | | | | | | | | **R** | | I | |
| Revisión cruzada | A | R | | C | C | C | C | | C | C | | I | C |
| Desplegar a producción | **A/R** | I | | | | C | C | | | C | C (runbook) | I | |
| Bitácora y ADR | | C | | | | | | | | | | **R** | |
| Retro del kit | A | R | | | | | | | | | | R | **R** |

## Formato estándar de informe (todos los agentes)
```
## Informe <ROL> — <plan/tarea>
Veredicto: APRUEBA | APRUEBA CON CONDICIONES | RECHAZA | NECESITA INFORMACIÓN
Hallazgos: (severidad Crítica/Alta/Media/Baja · evidencia archivo:línea · qué y por qué importa)
Recomendaciones:
Preguntas abiertas: (lo que no se puede suponer)
Reflexión:
  - Supuestos que hice:
  - Alternativas que descarté y por qué:
  - Confianza: alta | media | baja, y por qué:
  - Lo que no verifiqué:
  - Qué me haría cambiar de opinión:
Escalar al humano: sí/no — motivo
```
Los agentes que modifican archivos añaden **Registro de cambios**: archivos tocados, comandos ejecutados, pruebas y resultado.

## Control de costos
Cada subagente gasta tokens propios y cuenta contra el límite de uso del plan. Para no inflarlo:
- El plan indica qué revisiones hacen falta (no se consulta a todos siempre).
- Cada agente tiene `maxTurns` (valores iniciales, ajustables).
- Se puede fijar el modelo por agente con el campo `model` del archivo (por ejemplo `sonnet` para ejecución y un modelo más capaz para dirección). Por defecto hereda el de la sesión.

## Cómo agregar un agente
1. Define su carril (qué decide, qué **no** hace) y quién lo revisa.
2. Dale solo las herramientas que necesita. **No** incluyas `Agent`.
3. Si es de solo lectura, añade su nombre a `READONLY_AGENTS` en `.claude/hooks/_lib.mjs` y a `docs/kit/VALIDACION.md`.
4. Copia el bloque "Reglas comunes" y el formato de informe de otro agente.
5. Registra la decisión en la bitácora. Cambiar agentes es punto crítico (P10).
