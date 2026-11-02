---
description: "Retrospectiva del kit y del proceso: qué funcionó, qué falló, qué cambiar. Alimenta docs/kit/REGISTRO-KIT.md."
argument-hint: "[periodo o plan a revisar; por defecto lo más reciente]"
---
Retrospectiva sobre: **$ARGUMENTS** (si está vacío, las últimas 10 entradas de bitácora y el plan más reciente).

1. Reúne el material: bitácora del periodo, plan(es), registro de riesgos y los bloqueos que dieron los hooks (si el humano los menciona).
2. Invoca al `auditor` con ese material y estas preguntas:
   - ¿Qué protocolo se cumplió bien y cuál se violó o se esquivó? ¿Por qué?
   - ¿Qué protocolo estorbó sin aportar (fricción inútil)? ¿Qué propone cambiar?
   - ¿Qué agente produjo informes sin evidencia, con confianza excesiva o fuera de su carril?
   - ¿Qué falló que nadie había previsto? ¿Qué riesgo nuevo hay?
   - ¿Los puntos críticos y anomalías de P10 estuvieron bien definidos o faltó algo?
3. Responde tú también a esas preguntas con tu propia evidencia.
4. Añade una fila a `docs/kit/REGISTRO-KIT.md` con: fecha, qué se probó, resultado (funciona, funciona parcial, falla), causa y ajuste propuesto.
5. Propón cambios concretos (protocolo, agente, comando o hook) con su motivo, su riesgo y cómo comprobar que mejoran. **No los apliques**: modificar el kit es punto crítico (P10). Espera la aprobación del humano.
6. Pide al `escriba` una entrada de bitácora tipo `retro`.

Entrega: 5-8 líneas con lo más importante y la lista de cambios propuestos para que el humano decida.
