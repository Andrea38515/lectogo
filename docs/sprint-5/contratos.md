# docs/sprint-5/contratos.md

# Contratos de Gamificación - Sprint 5

## 1. Objetivo

Definir los contratos funcionales y técnicos para la implementación de:

- XP.
- Niveles.
- Logros e insignias.
- Ranking.

Estos contratos deberán ser respetados por Backend y Frontend para evitar que la lógica de negocio dependa del cliente.

La lógica sensible de gamificación debe permanecer en Cloud Functions. El cliente únicamente consulta los resultados calculados por el servidor. :contentReference[oaicite:0]{index=0}

---

## 2. XP y configuración de negocio

### 2.1 Fuente de configuración

Los valores de XP no deben quedar hardcodeados en las Cloud Functions.

La fuente oficial será:

```text
config_negocio