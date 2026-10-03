# Plan de pruebas - Sprint 4

**Proyecto:** LectoGo: Aplicación de Aprendizaje Interactivo para Fortalecer la Comprensión Lectora  
**Sprint:** 4 - Biblioteca y actividades

> Los casos de prueba deben ejecutarse realmente. La existencia del código no constituye aprobación. Los campos "Observado" y "Evidencia" se completan después de ejecutar cada prueba.

## Matriz de pruebas

| ID | Requisito | Precondición | Pasos | Esperado | Observado | Evidencia |
|---|---|---|---|---|---|---|
| TC-01 | Biblioteca | Lecturas cargadas | Abrir Biblioteca como estudiante | Se muestran las lecturas disponibles | Pendiente de ejecución | Por adjuntar |
| TC-02 | Invitado | Usuario no autenticado | Abrir biblioteca pública | Se permite acceder a la biblioteca pública sin funciones privadas | Pendiente de ejecución | Por adjuntar |
| TC-03 | Filtro por categoría | Existen varias categorías | Seleccionar una categoría | Solo aparecen lecturas de la categoría seleccionada | Pendiente de ejecución | Por adjuntar |
| TC-04 | Filtro por nivel | Existen varios niveles | Seleccionar un nivel | Solo aparecen lecturas del nivel seleccionado | Pendiente de ejecución | Por adjuntar |
| TC-05 | Filtros combinados | Existen datos compatibles | Aplicar categoría y nivel | Los resultados cumplen ambos filtros | Pendiente de ejecución | Por adjuntar |
| TC-06 | Búsqueda | Existen lecturas | Buscar un término existente | Aparecen resultados relacionados | Pendiente de ejecución | Por adjuntar |
| TC-07 | Búsqueda sin resultados | Biblioteca disponible | Buscar término inexistente | Se muestra un estado vacío controlado | Pendiente de ejecución | Por adjuntar |
| TC-08 | Detalle de lectura | Existe una lectura válida | Abrir una lectura | Se muestra el detalle correcto | Pendiente de ejecución | Por adjuntar |
| TC-09 | ID inválido | Aplicación disponible | Abrir lectura con ID inexistente | Se muestra estado de no encontrado o error controlado | Pendiente de ejecución | Por adjuntar |
| TC-10 | Actividad no asignada | Actividad no asignada al estudiante | Intentar acceder | Se rechaza o controla el acceso | Pendiente de ejecución | Por adjuntar |
| TC-11 | Opción múltiple | Actividad asignada | Seleccionar una opción | La opción queda seleccionada | Pendiente de ejecución | Por adjuntar |
| TC-12 | Verdadero/falso | Actividad asignada | Seleccionar respuesta | La respuesta queda seleccionada | Pendiente de ejecución | Por adjuntar |
| TC-13 | Cambio de respuesta | Existe una respuesta seleccionada | Seleccionar otra opción | Se conserva la última selección | Pendiente de ejecución | Por adjuntar |
| TC-14 | Envío de actividad | Actividad respondida | Enviar intento | El backend procesa el intento | Pendiente de ejecución | Por adjuntar |
| TC-15 | Calificación | Envío exitoso | Revisar resultado | Se muestra el resultado calculado | Pendiente de ejecución | Por adjuntar |
| TC-16 | Feedback | Intento procesado | Revisar retroalimentación | Se muestra el feedback correspondiente | Pendiente de ejecución | Por adjuntar |
| TC-17 | Cierre del intento | Intento enviado | Intentar modificar o reprocesar | El intento cerrado queda controlado | Pendiente de ejecución | Por adjuntar |
| TC-18 | Doble envío | Actividad lista para enviar | Enviar dos veces rápidamente | No se generan dos intentos válidos | Pendiente de ejecución | Por adjuntar |
| TC-19 | Fallo de red en biblioteca | Conexión interrumpida | Cargar biblioteca | Se muestra error controlado | Pendiente de ejecución | Por adjuntar |
| TC-20 | Fallo de red al enviar | Conexión interrumpida | Enviar actividad | Se muestra error y no falso éxito | Pendiente de ejecución | Por adjuntar |
| TC-21 | ID de actividad inválido | Aplicación disponible | Abrir actividad inexistente | Se muestra no encontrado/error controlado | Pendiente de ejecución | Por adjuntar |
| TC-22 | Usuario no autenticado | Sesión cerrada | Abrir actividad privada | Se bloquea o solicita autenticación | Pendiente de ejecución | Por adjuntar |
| TC-23 | Actividad cerrada | Actividad en estado cerrado | Intentar resolver/enviar | El sistema controla el acceso o envío | Pendiente de ejecución | Por adjuntar |
| TC-24 | Navegación posterior | Intento procesado | Volver a Biblioteca/Actividades | La navegación continúa funcionando | Pendiente de ejecución | Por adjuntar |

## Datos necesarios

- Estudiante autenticado.
- Usuario invitado/no autenticado.
- Lecturas publicadas.
- Varias categorías.
- Varios niveles de dificultad.
- Actividad asignada.
- Actividad no asignada.
- Pregunta de opción múltiple.
- Pregunta verdadero/falso.
- ID de lectura inexistente.
- ID de actividad inexistente.
- Conexión disponible.
- Prueba controlada sin conexión.
- Acceso a logs cuando sea necesario.

## Registro de ejecución

| Fecha | Entorno | Ejecutor | Ejecutados | Aprobados | Fallidos | Bloqueados | Pendientes |
|---|---|---|---:|---:|---:|---:|---:|
| Pendiente | Pendiente | Pendiente | 0 | 0 | 0 | 0 | 24 |

## Criterio de cierre

Los casos pendientes no cuentan como aprobados.

El proyecto establece como meta alcanzar al menos el 90 % de casos QA aprobados sin errores críticos antes del Sprint 6 y cero errores críticos abiertos en la entrega final.