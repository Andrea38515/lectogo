# Evidencias - Sprint 4

**Proyecto:** LectoGo: Aplicación de Aprendizaje Interactivo para Fortalecer la Comprensión Lectora  
**Sprint:** 4 - Biblioteca y actividades  
**Periodo:** 14 al 25 de septiembre de 2026

## Estado

**PENDIENTE DE EJECUCIÓN REAL**

Este documento no declara aprobado el Sprint 4. La existencia del código no sustituye la evidencia obtenida al ejecutar la aplicación.

## Matriz de evidencias

| ID | Funcionalidad | Evidencia requerida | Observado | Estado |
|---|---|---|---|---|
| TC-01 | Biblioteca | Captura del listado | Pendiente | PENDIENTE |
| TC-02 | Invitado | Captura de biblioteca pública | Pendiente | PENDIENTE |
| TC-03 | Filtro categoría | Capturas antes/después | Pendiente | PENDIENTE |
| TC-04 | Filtro nivel | Capturas antes/después | Pendiente | PENDIENTE |
| TC-05 | Filtros combinados | Captura de resultados | Pendiente | PENDIENTE |
| TC-06 | Búsqueda | Captura de resultados | Pendiente | PENDIENTE |
| TC-07 | Sin resultados | Captura del estado vacío | Pendiente | PENDIENTE |
| TC-08 | Detalle | Captura de lectura | Pendiente | PENDIENTE |
| TC-09 | ID inválido | Captura de error/no encontrado | Pendiente | PENDIENTE |
| TC-10 | Actividad no asignada | Captura del bloqueo/error | Pendiente | PENDIENTE |
| TC-11 | Opción múltiple | Captura de selección | Pendiente | PENDIENTE |
| TC-12 | Verdadero/falso | Captura de selección | Pendiente | PENDIENTE |
| TC-13 | Cambio de respuesta | Capturas antes/después | Pendiente | PENDIENTE |
| TC-14 | Envío | Captura + log | Pendiente | PENDIENTE |
| TC-15 | Calificación | Captura del resultado | Pendiente | PENDIENTE |
| TC-16 | Feedback | Captura de retroalimentación | Pendiente | PENDIENTE |
| TC-17 | Cierre | Evidencia de segundo intento controlado | Pendiente | PENDIENTE |
| TC-18 | Doble envío | Captura + verificación de un único intento | Pendiente | PENDIENTE |
| TC-19 | Fallo de red biblioteca | Captura del error | Pendiente | PENDIENTE |
| TC-20 | Fallo de red envío | Captura + log | Pendiente | PENDIENTE |
| TC-21 | ID actividad inválido | Captura de no encontrado | Pendiente | PENDIENTE |
| TC-22 | No autenticado | Captura del control de acceso | Pendiente | PENDIENTE |
| TC-23 | Actividad cerrada | Captura del control de estado | Pendiente | PENDIENTE |
| TC-24 | Navegación posterior | Captura o video | Pendiente | PENDIENTE |

## Incidencias

| ID | Caso | Incidencia | Severidad | Estado | Evidencia |
|---|---|---|---|---|---|
| INC-001 | Pendiente | No registrada hasta ejecutar las pruebas | Pendiente | Pendiente | Por adjuntar |

## Resumen

| Métrica | Resultado |
|---|---:|
| Casos definidos | 24 |
| Ejecutados | 0 |
| Aprobados | 0 |
| Fallidos | 0 |
| Bloqueados | 0 |
| Pendientes | 24 |

## Evidencias que deben adjuntarse

### Biblioteca

- Captura del listado de lecturas.
- Captura del filtro por categoría.
- Captura del filtro por nivel.
- Captura de filtros combinados.
- Captura de búsqueda con resultados.
- Captura de búsqueda sin resultados.
- Captura del detalle de una lectura.
- Captura de un ID inexistente.

### Actividades

- Captura de pregunta de opción múltiple.
- Captura de pregunta verdadero/falso.
- Captura de selección de respuesta.
- Captura del cambio de respuesta.
- Captura del envío.
- Captura del resultado.
- Captura del feedback.
- Evidencia del cierre del intento.

### Casos negativos

- Fallo de red al cargar biblioteca.
- Fallo de red al enviar actividad.
- ID de actividad inválido.
- Usuario no autenticado.
- Actividad no asignada.
- Actividad cerrada.
- Doble envío.

## Relación con el DDS

El flujo definido para resolver una actividad es:

1. `ActivityScreen` reúne las respuestas.
2. El cliente invoca `registrarIntento`.
3. `registrarIntento` valida las respuestas.
4. Se calcula el porcentaje de aciertos.
5. Se crea el documento en `intentos`.
6. Se actualizan XP, nivel y racha.
7. Se evalúan los logros.
8. Se devuelve el resultado y la retroalimentación al cliente.

Además, los intentos no deben crearse directamente desde el cliente.

Estos comportamientos deben comprobarse mediante ejecución real y evidencia, no únicamente mediante revisión del código.

## Conclusión

**Estado actual: PENDIENTE DE EJECUCIÓN.**

No se declara aprobado el Sprint 4 hasta ejecutar los casos de prueba y registrar sus resultados y evidencias correspondientes.