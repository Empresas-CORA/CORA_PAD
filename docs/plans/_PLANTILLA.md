---
id: PLAN-000
titulo: <título corto del plan>
estado: BORRADOR   # informativo; la aprobación real es el hash que registra scripts/approve-plan.mjs
version: 1
alcance_archivos:  # ÚNICOS archivos que se podrán modificar (globs). Acótalos; "**" solo no se acepta.
  - src/ejemplo/**
  - tests/ejemplo/**
---

# PLAN-000 · <título>

> Un plan aprobado no se edita. Un cambio de alcance es una enmienda: nueva versión (`PLAN-000-v2`) y nueva aprobación.
> El avance de las tareas se registra en la bitácora, no aquí.

## 1. Objetivo
Qué se quiere lograr y para quién, en 2-3 frases. Criterio de éxito medible.

## 2. Análisis (P1, P2)
**Hechos verificados** (con evidencia: archivo:línea, documento, enlace)
-

**Hipótesis no verificadas** (cada una debe resolverse antes de aprobar)
-

**Preguntas abiertas** (P3; deben quedar vacías antes de aprobar)
-

**Impacto sobre lo existente**
-

## 3. Alcance
**Dentro:**
-

**Fuera (explícitamente no se hará):**
-

## 4. Enfoque técnico
Decisión y por qué. Alternativas descartadas. Si cambia el stack o la arquitectura: referencia al ADR en `docs/arquitectura/`.

## 5. Tareas (P6)
Cada tarea: atómica, verificable, reversible. Una rama o un commit por tarea.

### T1 · <nombre>
- **Qué:**
- **Archivos:**
- **Depende de:** ninguna
- **Responsable:** desarrollador | ux-ui | devops
- **Criterio de aceptación:**
- **Verificación (comando o prueba):**
- **Reversa:** `git revert <commit>` o pasos
- **Revisiones requeridas:** CTO, CISO, QA

### T2 · <nombre>
- **Qué:**
- **Archivos:**
- **Depende de:** T1
- **Responsable:**
- **Criterio de aceptación:**
- **Verificación:**
- **Reversa:**
- **Revisiones requeridas:**

## 6. Riesgos (P7)
Los riesgos de este plan también se registran en `docs/riesgos/REGISTRO-DE-RIESGOS.md`.

| Riesgo | Prob. (1-3) | Impacto (1-3) | Mitigación | Contingencia |
|---|---|---|---|---|
| | | | | |

## 7. Plan de reversa global
Cómo dejar el sistema como estaba si todo el plan se cancela.

## 8. Puntos críticos de este plan (P10)
Dónde se detendrá a pedir aprobación humana (despliegue, DNS, migraciones, gasto, etc.).
-

## 9. Criterios de terminado (P12)
-

## 10. Consultas al equipo
Resumen de lo que dijeron CEO, CIO, CTO, CISO, CSO y auditor, con veredicto y condiciones. Enlaza a las entradas de bitácora.

## 11. Aprobación
La aprobación la da el humano ejecutando `node scripts/approve-plan.mjs docs/plans/<este archivo>`. Este texto no aprueba nada.
