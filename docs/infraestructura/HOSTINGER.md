# Infraestructura: Hostinger + coracontrol.com

Esta es la parte "física" que montan los humanos, con guía de Claude paso a paso. Los agentes **no** tocan producción (P10, P11): preparan checklists, scripts y runbooks; el humano ejecuta.

> **Si este repositorio es público**, todo lo que escribas aquí es público. No pongas contraseñas, tokens, datos de FTP, nombres de personas con acceso ni nada que ayude a atacar. Los registros DNS son públicos de por sí; los accesos no. Guarda los accesos en un gestor de contraseñas o en un repositorio privado.

## 1. Inventario (todo `[POR DEFINIR]` es un desconocido)

**Indicado por el humano** (sin verificar en el panel todavía)
- El dominio `coracontrol.com`, el hosting y el correo corporativo están en Hostinger y llevan casi un año sin usarse; no hay nada publicado.
- Habrá **varios productos** bajo el dominio.
- El sitio de ERIESA se hará con HTML/CSS/JS propio y se desplegará con la integración de Git de Hostinger.
- Los repositorios están en GitHub, en la organización `Empresas-CORA`, un repositorio por producto.
- El equipo desarrolla en Windows 11.

| Dato | Valor |
|---|---|
| Plan de Hostinger (nombre exacto) | Hosting Web Empresarial (lo indicó el humano el 2026-11-01; confirmar en Plan Details) |
| Límites del plan (sitios, subdominios, almacenamiento, bases de datos) | 50 sitios · 5 apps Node.js · 100 subdominios · 50 GB NVMe · 600 000 inodos · 5 buzones por sitio (gratis 1 año) · 60 PHP workers · 75 conexiones MySQL · IP dedicada · WooCommerce Basic (lo indicó el humano). Contraste con la documentación en §2.2 |
| Fecha de vencimiento del **hosting** y renovación automática | [POR DEFINIR] |
| Fecha de vencimiento del **dominio** y renovación automática | [POR DEFINIR] |
| Nameservers actuales del dominio | [POR DEFINIR] |
| ¿Dominio comprado en Hostinger o conectado desde otro registrador? | [POR DEFINIR] |
| Estructura de los productos (subdominios, por ejemplo `pad.coracontrol.com`) | [POR DEFINIR] |
| Versiones de PHP / Node.js disponibles en el plan | [POR DEFINIR] |
| ¿Acceso SSH habilitado? | [POR DEFINIR] |
| Base de datos disponible en el plan (tipo, cuántas) | [POR DEFINIR] |
| ¿Respaldos incluidos? ¿Frecuencia y dónde se restauran? | [POR DEFINIR] |
| Cuenta de GitHub conectada a Hostinger | [POR DEFINIR] |
| ¿Hostinger ya tiene acceso aprobado a los repositorios de `Empresas-CORA`? | [POR DEFINIR] |

## 1.1 F0 paso a paso: cómo averiguar esos datos
Todo se hace desde el navegador, sin instalar nada. Anota **texto**, no contraseñas.

1. Entra al panel de Hostinger (hPanel).
2. Ve a **Websites** (Sitios web). Pasa el cursor sobre tu sitio y pulsa **Manage site**.
3. En la barra lateral abre **Hosting plan → Plan Details**. Ahí aparecen: dominio e IP, los límites principales del plan, los **nameservers**, la ubicación del servidor y los datos de FTP. **No copies ni compartas los datos de FTP.** Si no ves el nombre del plan, búscalo en la sección de facturación o suscripciones del panel (no verifiqué su ubicación exacta).
4. Ve a **Domains**. La lista **My domains** muestra cada dominio con su estado, **fecha de vencimiento** y renovación automática. Pulsa **Manage** sobre `coracontrol.com`: **Domain Overview** muestra el vencimiento y los nameservers. Los dominios comprados en Hostinger aparecen separados de los **External domains** (dominios conectados desde otro registrador).
5. Comprobación externa de nameservers, en PowerShell: `Resolve-DnsName coracontrol.com -Type NS`. Compara con los de **Plan Details**: deben coincidir para que el dominio apunte a tu hosting.
6. Pásale a Claude: nombre y límites del plan, fechas de vencimiento (hosting y dominio), nameservers y si el dominio aparece como comprado en Hostinger o externo.

> **Urgente:** revisa las fechas de vencimiento hoy. Si el hosting o el dominio se contrataron con una promoción de primer año `[NO VERIFICADO]` y llevan casi un año sin uso, podrían vencer pronto, y perder `coracontrol.com` sería el peor caso. Activa la renovación automática cuando lo confirmes.

## 2. Verificado en la documentación de Hostinger
- Node.js gestionado: planes Business y Cloud; en VPS es manual.
- Despliegue de Node.js desde GitHub o subiendo `.zip`; los archivos compilados de apps Node quedan fuera de `public_html`.
- Un plan de hosting se conecta a **una sola cuenta de GitHub** a la vez (documentación de Node.js hosting).
- Hostinger accede a GitHub mediante una **GitHub App**. Los repositorios de una **organización** sí se soportan, pero un **administrador de la organización** debe aprobar el acceso (Configuración de la organización → *Third-party access* → Grant/Request, eligiendo los repositorios). Si un repositorio no aparece en Hostinger: refrescar el panel o desconectar y reconectar GitHub.
- El panel muestra, en **Plan Details**: límites del plan, nameservers, servidor y datos de FTP.
- Node.js gestionado incluye monitoreo de vulnerabilidades de dependencias (sección Seguridad del panel).

**Consultado el 2026-11-01** (la herramienta de lectura resume las páginas; confirma las cifras en tu **Plan Details**):
- Límites de Node.js (nivel Business/Unlimited): **5 sitios Node.js**, NPROC 120, entry processes 60 **compartidos por todos los sitios del plan**; cada petición se corta a los **120 s**; **no se aceptan WebSockets entrantes**; **no hay procesos permanentes** (colas, bots, temporizadores se detienen al desplegar o reiniciar; para tareas largas, usar cron); `dominio.tld` y `www.dominio.tld` corren procesos distintos; una app Next.js puede usar unos 10-11 hilos. Fuente: <https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/>
- Parámetros del plan (columna "Unlimited", que Hostinger indica que equivale al antiguo Business): 2 núcleos, 3 GB de RAM, 600 000 inodos, 150 bases de datos, 3 GB por base (no queda claro si por base o en total), MySQL: 75 conexiones por usuario y 500 globales, 60 PHP workers, correo saliente desde servidor 10/minuto y 100/día. Tus cifras (600 000 inodos, 60 workers, 75 conexiones) coinciden con esa columna. Fuente: <https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/>
- Despliegue desde Git (Node.js): **repositorios privados soportados** (conectas la cuenta dueña; el despliegue por URL solo sirve para repos públicos); **autodespliegue en cada push** (webhook → instala dependencias, compila, reinicia); la **rama y el directorio raíz son configurables** (puede ser una subcarpeta). Se puede conectar una cuenta de GitHub y una de GitLab a la vez; "Switch account" detiene los despliegues de la cuenta anterior. La documentación no menciona la aprobación de organizaciones: sigue valiendo lo de arriba (viene de otra página de soporte). Fuente: <https://docs.hostinger.com/node.js/git-deployments.md>
- **No verificado:** cómo despliega Hostinger un sitio **estático/PHP** desde Git (qué carpeta publica, si permite elegir subcarpeta, si deja `.git` o carpetas ocultas accesibles). La página de documentación no estaba al alcance. Hasta comprobarlo, **no despliegues ERIESA desde un repo que tenga `.claude/` ni `docs/` en la raíz** (R-014).
- **No verificado:** si el plan incluye PostgreSQL. Las páginas leídas solo hablan de MySQL.

## 2.1 Fases (en orden; cada una termina con evidencia, P12)
| Fase | Qué se hace | Quién | Terminado cuando |
|---|---|---|---|
| F0 Inventario | Completar la tabla de arriba siguiendo 1.1 | Humano (con Claude guiando) | Sin `[POR DEFINIR]` |
| F1 Cuentas y accesos | 2FA en Hostinger, GitHub y correo; gestor de contraseñas; lista de quién accede a qué | Humano; CSO define reglas | Lista de accesos guardada **fuera de un repo público** |
| F2 Dominio y DNS | Registrar **todos** los registros DNS actuales antes de cambiar nada; renovación automática | Humano; CSO revisa | Copia del estado DNS guardada |
| F3 Entornos | Producción y pruebas separados (por ejemplo un subdominio de pruebas) | Humano; DevOps escribe el runbook | Ambos responden y están aislados |
| F4 TLS/SSL y cabeceras | Certificado activo, redirección a HTTPS, cabeceras de seguridad | Humano; CSO verifica | Verificación externa pasada |
| F5 Base de datos | Crear BD y usuario con mínimo privilegio; credenciales solo en el panel o `.env` | Humano; CIO define el modelo | Conexión probada desde pruebas |
| F6 Despliegue | Repositorio → pruebas → despliegue. Producción **siempre con aprobación humana** | DevOps prepara; humano aprueba | Un despliegue de prueba completo y reversible |
| F7 Respaldos | Respaldo automático y **restauración probada** | Humano; CSO exige la prueba | Una restauración exitosa documentada |
| F8 Monitoreo | Aviso de caída y de caducidad de certificado/dominio | Humano; CSO define alertas | Alerta de prueba recibida |

## 2.2 El plan frente a los productos (análisis, 2026-11-01)
Hechos de §2 + lo que el humano indicó. Lo marcado `[INFERENCIA]` es razonamiento, no dato.

| Tema | Qué dice el plan | Consecuencia |
|---|---|---|
| Apps Node.js | Máximo 5 | PAD, MIRA, SAND, CONTROL y DAYCARE ocupan los 5 cupos; ERIESA, al ser estática, no cuenta. **No queda ninguno libre** para un staging de Node.js, una API aparte o un panel de administración `[INFERENCIA]`. Si hace falta más, se resuelve en el ADR de cada producto (una sola app que sirva API y web, o subir de plan). |
| Procesos y memoria | 120 NPROC / 60 EP compartidos por todo el plan; 3 GB de RAM | Cinco apps compiten por el mismo tope; un pico en una puede dar 503 a las demás `[INFERENCIA]`. Medir en el despliegue de prueba (F6). |
| Tiempo real | Sin WebSockets entrantes; sin procesos permanentes; peticiones de 120 s | **DAYCARE promete "datos y alertas en tiempo real" desde un brazalete IoT.** Con este plan no se puede alojar un servidor WebSocket ni un consumidor MQTT permanente. Se puede recibir datos por HTTP (el dispositivo envía), usar notificaciones push de terceros y sondeo `[INFERENCIA]`. Es una decisión de arquitectura para el ADR de DAYCARE antes de la fase de Diseño (R-012). |
| Base de datos | MySQL; 75 conexiones por usuario | Se comparten entre apps. Con 5 apps, ~15 conexiones cada una como tope de diseño `[INFERENCIA]`. PostgreSQL no verificado. |
| Datos sensibles | Hosting compartido | SAND y DAYCARE manejarán datos personales; DAYCARE, de menores. Para la universidad se usa una guardería ficticia; **antes de datos reales** hay que revisar si un hosting compartido es adecuado (CISO/CSO) y la normativa aplicable (R-013). |
| Correo | 5 buzones por sitio; envío desde servidor 10/min y 100/día | Alcanza para correos de sistema con poco volumen; no para notificaciones masivas `[INFERENCIA]`. |
| Dominio y subdominios | 100 subdominios | Un subdominio por producto (`pad.`, `mira.`, `sand.`, `control.`, `daycare.`) sobra. |

## 2.3 Visibilidad de los repositorios (revisado 2026-11-01)
**Hechos**
- `cora_pad`, `cora-daycare` y `eriesa_web` (organización `Empresas-CORA`) son **públicos**: se leyeron sin credenciales. No vi repositorios de MIRA, SAND ni CONTROL `[NO VERIFICADO]`.
- Estado: `cora_pad` está vacío (rama `main`, sin commits); `eriesa_web` tiene 1 commit con una página de prueba (rama `master`, archivo `LP_ERIESA.html`); `cora-daycare` tiene 5 commits de documentación del proyecto universitario.
- Escaneo del historial completo (patrones de credenciales y nombres de archivo como `.env`, llaves, SQL, volcados): **sin hallazgos**. Límite: es una búsqueda por patrones, no una garantía.
- Ya es público: nombres completos de 4 integrantes y sus roles (README y PDF de DAYCARE) y un correo personal en los metadatos del primer commit de DAYCARE y de ERIESA.
- Pasar un repo a privado **no retira** lo que ya se copió o se clonó mientras fue público (forks, clones, cachés).
- GitHub: protección de ramas y *rulesets* en repos **privados** requieren plan de pago (Pro, Team o Enterprise); en una organización Free solo existen para repos públicos. Fuentes: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule>, <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- Hostinger soporta repos privados (Node.js, conectando la cuenta dueña).

**Recomendación (la decisión es del humano, P10)**
1. Privados antes del primer commit que agregue el kit o código: el kit agrega inventario de infraestructura, registro de riesgos y bitácora, que sirven de mapa a un atacante (R-010). Aplica a PAD, MIRA, SAND, CONTROL y DAYCARE (menores, nombres de personas, seguridad).
2. ERIESA: lo que se publique en la web será público de todos modos, pero su repo no tiene por qué serlo. Si queda público, que contenga **solo** el sitio (sin kit, sin `docs/` de gobernanza).
3. Al pasar a privado sin plan de pago se pierde la protección de ramas. Compensación: convención de "nadie hace push directo a la rama principal", ramas por tarea (P6), revisión del diff por otra persona y los hooks del kit. Evaluar GitHub Team si el equipo lo justifica (costo `[NO VERIFICADO]`).
4. Tras privatizar: reconectar/comprobar el acceso de Hostinger (GitHub App aprobada por un administrador de la organización) e invitar a los integrantes.

## 3. Reglas para agentes
1. Ningún agente recibe credenciales de producción, llaves SSH de producción ni tokens con permiso de escritura en producción.
2. Ningún agente cambia DNS, certificados, correo ni accesos. Redactan el cambio; lo aplica el humano (P10).
3. `ssh`, `scp`, `rsync`, `git push` y `gh` con cambios piden confirmación del humano (hook de comandos).
4. DevOps entrega runbooks verificables (pasos, comprobación y reversa) en `docs/infraestructura/`.
5. Si algo del servidor se comporta distinto a lo documentado: anomalía (P10). Se detiene y se avisa.
6. Cambiar la visibilidad de un repositorio (público/privado) es un punto crítico: lo decide el humano.

## 4. Registro de accesos (llenar en F1; **no en un repo público**)
| Sistema | Quién tiene acceso | Nivel | 2FA | Último repaso |
|---|---|---|---|---|

## 5. Preguntas pendientes para el humano
1. Los datos de la tabla de la sección 1 (siguiendo 1.1).
2. ¿Cómo se repartirán los productos bajo `coracontrol.com`? Propuesta: un subdominio por producto.
3. ¿Qué repositorios deben ser públicos y cuáles privados? Recomendación y razones: §2.3. Decide el humano.
4. ¿Cuándo vence el hosting y el dominio? (R-007, sigue sin respuesta.)

## Fuentes
- https://docs.hostinger.com/getting-started/overview
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger
- https://www.hostinger.com/support/how-to-update-github-repository-permissions-for-node-js-hosting/
- https://www.hostinger.com/support/1583276-how-to-find-the-details-of-your-hosting-plan-in-hostinger/
- https://www.hostinger.com/support/6940479-how-to-use-the-domains-section-in-hpanel/
