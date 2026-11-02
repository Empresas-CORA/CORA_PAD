# ADR-0001 · Stack tecnológico

- **Estado:** PROPUESTO (decisión **bloqueada**: faltan datos; ver "Lo que hay que saber antes de decidir")
- **Fecha:** 2026-10-31
- **Decide:** humano
- **Propone:** CTO, con CIO y CSO (por definir al ejecutar `/nuevo-plan`)

## Contexto
Se usará Hostinger y el dominio `coracontrol.com`. El stack depende del **tipo de plan de hosting** y del **tipo de proyecto**, que todavía no están confirmados. Elegir antes de saberlo sería suponer (P2).

### Hechos verificados (documentación de Hostinger, consultada el 2026-10-31)
- Hostinger aloja sitios estáticos, aplicaciones PHP, WordPress y aplicaciones Node.js.
- Las **aplicaciones Node.js gestionadas** están disponibles en los planes Business Web Hosting y Cloud (Startup, Professional, Enterprise, Enterprise Plus). Se despliegan desde GitHub o subiendo un `.zip`.
- Los planes **VPS** y servidores dedicados también soportan Node.js, pero requieren configuración manual por línea de comandos.
- Un plan de hosting solo se puede conectar a **una cuenta de GitHub** a la vez.
- Para sitios estáticos/PHP existe despliegue desde Git (funcionalidad distinta a la de Node.js).

### Hechos aportados por el humano (2026-11-01, sin verificar en el panel)
- Habrá varios productos bajo `coracontrol.com`, cada uno con su propio repositorio en la organización de GitHub `Empresas-CORA`.
- El sitio de ERIESA será HTML/CSS/JS propio, desplegado con la integración de Git de Hostinger (encaja con la opción A).
- Los productos con cuentas de usuario y datos (SaaS) probablemente necesiten las opciones B, C o D `[HIPÓTESIS]`. Es probable que haya **un ADR de stack por producto** y no uno solo para todos.

### Plan contratado (2026-11-01)
El humano indicó **Hosting Web Empresarial** (5 apps Node.js, 50 sitios, MySQL, 600 000 inodos). Hechos y consecuencias en `docs/infraestructura/HOSTINGER.md` §2 y §2.2. Lo que más pesa en la decisión: **sin WebSockets entrantes ni procesos permanentes**, 5 apps Node.js compartiendo recursos y MySQL con 75 conexiones por usuario. Si algún producto (en particular DAYCARE, por su brazalete IoT) exige tiempo real continuo, este plan no basta para ese producto y habría que evaluar la opción D (VPS) solo para él. Es una decisión por producto, no global.

### Desconocidos
- ~~Plan de Hostinger contratado~~ → respondido arriba (falta confirmarlo en Plan Details).
- `[POR DEFINIR]` Tipo de proyecto: sitio informativo, aplicación con inicio de sesión y datos, SaaS multiusuario.
- `[POR DEFINIR]` Base de datos necesaria y cuál ofrece el plan (verificar en el panel; no asumir).
- `[POR DEFINIR]` Experiencia del equipo (lenguajes que ya dominan o quieren aprender).
- `[POR DEFINIR]` Estructura de los productos bajo el dominio (subdominios) y cuántos sitios/subdominios permite el plan.
- `[POR DEFINIR]` Si Hostinger ya tiene acceso aprobado a los repositorios de la organización (requiere un administrador de la organización).

## Criterios de decisión (propuestos, el humano ajusta pesos)
1. Compatibilidad con el plan de hosting (que no obligue a migrar).
2. Seguridad por defecto y facilidad de mantener parches.
3. Costo total (hosting, servicios, tiempo).
4. Mantenibilidad: que un agente y un humano puedan entender y probar el código.
5. Curva de aprendizaje del equipo.
6. Facilidad de pruebas automáticas (P12).
7. Reutilización entre los distintos proyectos del dominio.

## Opciones (sin recomendación hasta cerrar los desconocidos)
| Opción | Cuándo encaja | Contras | Responsabilidad operativa |
|---|---|---|---|
| A. Sitio estático (HTML/CSS/JS o generador) | Contenido informativo, sin cuentas de usuario | Sin lógica de servidor propia | Baja |
| B. PHP en hosting compartido (p. ej. Laravel) | Planes web tradicionales; aplicación con base de datos | Menos flexible para procesos persistentes y tiempo real | Media |
| C. Node.js gestionado (Business/Cloud) | Aplicación web moderna, despliegue desde GitHub | Requiere plan Business o Cloud; límites de recursos del plan | Media |
| D. VPS con Node.js/Docker | Control total, varios servicios, procesos persistentes | El equipo administra servidor, parches, firewall y respaldos | **Alta** (CSO involucrado desde el día 1) |

## Decisión
Pendiente.

## Cómo se cierra este ADR
1. El humano confirma plan de Hostinger y tipo de proyecto (ver preguntas en `docs/infraestructura/HOSTINGER.md`).
2. `/nuevo-plan "Definir stack"` consulta a CTO, CIO, CISO y CSO.
3. El humano decide y el estado pasa a ACEPTADO (cambiarlo después es punto crítico).

## Fuentes
- https://docs.hostinger.com/getting-started/overview
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger
