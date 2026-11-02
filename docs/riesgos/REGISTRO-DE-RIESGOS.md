# Registro de riesgos (P7)

Escala: probabilidad e impacto de 1 (bajo) a 3 (alto). **Puntaje = P × I.** Puntaje ≥ 6: requiere mitigación activa antes de continuar. Puntaje 9: escalar al humano (P10).

Estados: `abierto`, `mitigado`, `aceptado` (solo el humano acepta), `ocurrido`, `cerrado`.

| ID | Riesgo | P | I | Puntaje | Mitigación (evitarlo) | Contingencia (si ocurre) | Responsable | Estado | Origen |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | Un agente modifica código sin plan aprobado | 2 | 3 | 6 | Hooks plan-gate y guard-bash; revisión humana de commits | Revertir con git; revocar aprobación; entrada de incidente | humano + CTO | abierto | Kit v0.1 |
| R-002 | Las barreras de Bash se evaden con comandos opacos | 2 | 2 | 4 | Guard heurístico + git + revisión de diff + CI | Revertir; endurecer el guard con el caso nuevo | CTO + CISO | abierto | Kit v0.1 |
| R-003 | Credenciales de producción expuestas a un agente o al repo | 1 | 3 | 3 | Agentes sin credenciales de producción; `.env` ignorado; permisos deny | Rotar credenciales; revisar historial de git | CSO | abierto | Kit v0.1 |
| R-004 | Costo de uso elevado por muchos subagentes | 2 | 2 | 4 | Reviewers solo cuando el plan lo pide; `maxTurns` en cada agente; seguimiento de consumo | Reducir agentes consultados; ajustar modelo por agente | CEO + humano | abierto | Kit v0.1 |
| R-005 | Sesgo de consenso: los agentes comparten el mismo punto ciego | 2 | 2 | 4 | Auditor independiente; pruebas ejecutables; humano en puntos críticos | Revisión externa de la decisión | auditor | abierto | Kit v0.1 |
| R-006 | Elegir stack incompatible con el plan de hosting | 2 | 3 | 6 | ADR-0001 solo se decide tras conocer el plan de Hostinger | Migrar de plan o de stack antes de escribir código | CIO + CTO | abierto | Stack pendiente |
| R-007 | El dominio o el hosting vencen o se suspenden (casi un año sin uso; si fue promoción de primer año `[NO VERIFICADO]`) | 2 | 3 | 6 | Revisar fechas de vencimiento en el panel (HOSTINGER.md §1.1) y activar renovación automática | Renovar de inmediato; contactar soporte de Hostinger | humano + CSO | abierto | Inventario F0 |
| R-008 | Los hooks no se ejecutan (Node fuera del PATH, versión antigua de Claude Code) y las barreras desaparecen en silencio | 2 | 3 | 6 | `onFailure: block` (Claude Code ≥ 2.1.295); canario de arranque en CLAUDE.md; pruebas V0-V4 y V16 | Detener el trabajo; corregir y repetir V1-V4 | humano + CTO | abierto | Revisión de Windows |
| R-009 | La herramienta PowerShell esquiva el guard de comandos | 2 | 3 | 6 | Matcher `Bash\|PowerShell` y análisis de cmdlets; prueba V15 | Revertir con git; ampliar el guard con el caso nuevo | CTO + CISO | abierto | Revisión de Windows |
| R-010 | Repositorios públicos exponen docs de infraestructura, riesgos o bitácora | 2 | 2 | 4 | Regla en P11; accesos fuera de repos públicos; revisar qué repos deben ser privados | Pasar el repo a privado y rotar lo que se haya expuesto (lo decide el humano) | humano + CSO | abierto | Inventario de repositorios |
| R-011 | Copiar el kit sobre un repositorio existente pisa su `README.md`, `.gitignore` u otros archivos | 3 | 2 | 6 | `scripts/install-kit.mjs`: simula primero, no sobrescribe, fusiona, se niega con cambios sin confirmar; 60 pruebas | `git restore` / `git revert` de la rama `chore/instalar-kit`; revisar los `.kit-nuevo` | humano | mitigado | Instalación en repos reales |
| R-012 | El requisito de tiempo real de DAYCARE (brazalete IoT) es incompatible con el plan (sin WebSockets entrantes ni procesos permanentes) | 2 | 3 | 6 | Decidirlo en el ADR de DAYCARE antes de la fase de Diseño; evaluar VPS solo para ese producto | Rediseñar con envío HTTP + notificaciones push de terceros, o migrar ese producto | CTO + CIO | abierto | Análisis del plan (HOSTINGER §2.2) |
| R-013 | Datos personales (SAND, DAYCARE con datos de menores) en hosting compartido sin revisión de seguridad ni de normativa | 2 | 3 | 6 | Usar datos ficticios hasta tener revisión del CISO/CSO y marco legal definido (CONTEXTO.md) | Retirar datos reales, notificar según normativa, rotar credenciales | CISO + CSO + humano | abierto | Análisis del plan |
| R-014 | Desplegar un sitio estático desde la raíz de un repo con kit publica `.claude/`, `docs/` o `.git` en la web | 2 | 2 | 4 | ERIESA sin kit en la raíz o con carpeta de despliegue separada; probar qué publica Hostinger antes de enlazar `[NO VERIFICADO]` | Quitar el despliegue; revisar qué se expuso; rotar lo que corresponda | DevOps + CSO | abierto | Análisis del plan |
| R-015 | Repos privados sin protección de ramas (organización GitHub Free): cualquiera con escritura puede empujar a la rama principal | 2 | 2 | 4 | Convención de ramas por tarea y revisión del diff; hooks; evaluar GitHub Team | Revertir con git; restringir permisos de escritura | humano | abierto | Visibilidad de repos (HOSTINGER §2.3) |

> Agrega los riesgos del proyecto debajo, sin renumerar. No borres filas: cambia su estado.
