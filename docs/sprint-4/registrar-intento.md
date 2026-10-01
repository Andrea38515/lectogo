# Contrato de `registrarIntento`

## 1. Descripción

`registrarIntento` es una Cloud Function callable utilizada para registrar el resultado de una actividad de comprensión lectora.

El cliente envía el identificador de la actividad y las respuestas del estudiante. La función valida las respuestas, calcula el porcentaje de aciertos, registra el intento y procesa la experiencia (XP), el nivel y los logros correspondientes.

Este contrato permite que el frontend consuma la función sin depender de la implementación interna del backend.

## 2. Entrada

La función recibe un objeto con los siguientes datos:

```json
{
  "actividadId": "actividad_123",
  "respuestas": []
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `actividadId` | `string` | Sí | Identificador de la actividad que está resolviendo el estudiante. |
| `respuestas` | `array` | Sí | Respuestas proporcionadas por el estudiante para las preguntas de la actividad. |

### Ejemplo conceptual

```json
{
  "actividadId": "actividad_123",
  "respuestas": [
    {
      "preguntaId": "pregunta_001",
      "respuesta": "opcion_a"
    },
    {
      "preguntaId": "pregunta_002",
      "respuesta": "verdadero"
    }
  ]
}
```

> La documentación funcional disponible define `actividadId` y `respuestas` como datos de entrada, pero no especifica la estructura interna exacta de cada elemento de `respuestas`. Esa estructura debe mantenerse alineada con la implementación de `registrarIntento`.

## 3. Procesamiento

Al recibir la solicitud, `registrarIntento` realiza las siguientes operaciones:

1. Recibe `actividadId` y `respuestas`.
2. Valida cada respuesta contra las preguntas correspondientes.
3. Calcula el porcentaje de aciertos.
4. Registra el intento en la colección `intentos`.
5. Procesa la experiencia obtenida mediante `calcularXp`.
6. Actualiza el nivel mediante `actualizarNivel`.
7. Evalúa los logros mediante `evaluarLogros`.
8. Devuelve al frontend el resultado de la actividad, el XP obtenido y los nuevos logros, si existen.

## 4. Salida

La respuesta debe proporcionar al frontend la información necesaria para mostrar la retroalimentación de la actividad.

Ejemplo conceptual:

```json
{
  "porcentaje": 80,
  "explicaciones": [],
  "xpGanado": 10,
  "logrosNuevos": []
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `porcentaje` | `number` | Porcentaje de respuestas correctas obtenido en la actividad. |
| `explicaciones` | `array` | Información utilizada para mostrar la retroalimentación de las respuestas. |
| `xpGanado` | `number` | Cantidad de experiencia obtenida por el estudiante. |
| `logrosNuevos` | `array` | Logros obtenidos como resultado de la actividad, si existen. |

> El DDS confirma que la función devuelve el resultado, el XP ganado y los logros nuevos. La estructura detallada de `explicaciones` y `logrosNuevos` no está especificada en los documentos funcionales actuales y debe coincidir con la implementación real de la Cloud Function.

## 5. Retroalimentación

Después de resolver la actividad, el frontend debe utilizar la información devuelta por `registrarIntento` para mostrar el resultado al estudiante.

La retroalimentación debe contemplar:

- Resultado de la actividad.
- Porcentaje de aciertos.
- Explicaciones de las respuestas.
- XP obtenido.
- Nuevos logros, cuando corresponda.

Esto responde al requisito RF-008 de proporcionar retroalimentación después de responder las preguntas.

## 6. Experiencia (XP)

El cálculo de XP es responsabilidad del backend.

`registrarIntento` invoca internamente el procesamiento de XP y actualización de nivel. Por esta razón, el frontend no debe calcular ni modificar directamente el XP obtenido.

El valor recibido en `xpGanado` debe utilizarse para mostrar al estudiante la experiencia obtenida.

## 7. Errores

Los documentos funcionales actuales no establecen un catálogo oficial de códigos de error para `registrarIntento`.

Por lo tanto, los códigos de error utilizados por el frontend deben documentarse a partir de la implementación real de la Cloud Function.

La implementación deberá contemplar situaciones como:

- Usuario no autenticado.
- `actividadId` ausente o inválido.
- `respuestas` ausente o con formato inválido.
- Actividad inexistente.
- Pregunta inexistente.
- Respuesta no válida.
- Error interno al registrar el intento.

> Los códigos exactos y sus mensajes no están definidos en el ERS/DDS disponible, por lo que no se establecen valores específicos en este documento.

## 8. Seguridad

El registro de los intentos debe realizarse mediante `registrarIntento`.

El cliente no debe escribir directamente los documentos de la colección `intentos`. El registro del intento forma parte del procesamiento realizado por la Cloud Function.

## 9. Ejemplo de consumo desde Frontend

El frontend puede invocar la función utilizando el contrato definido anteriormente:

```javascript
const resultado = await registrarIntento({
  actividadId,
  respuestas,
});
```

Posteriormente puede utilizar la respuesta:

```javascript
console.log(resultado.porcentaje);
console.log(resultado.explicaciones);
console.log(resultado.xpGanado);
console.log(resultado.logrosNuevos);
```

## 10. Resumen del contrato

### Entrada

```text
registrarIntento({
  actividadId,
  respuestas
})
```

### Salida

```text
{
  porcentaje,
  explicaciones,
  xpGanado,
  logrosNuevos
}
```

### Flujo

```text
Frontend
   ↓
registrarIntento
   ↓
Validar respuestas
   ↓
Calcular porcentaje
   ↓
Registrar intento
   ↓
Calcular XP y actualizar nivel
   ↓
Evaluar logros
   ↓
Devolver resultado
   ↓
Frontend muestra retroalimentación
```

## 11. Referencias funcionales

- **RF-007:** Actividades de comprensión lectora.
- **RF-008:** Retroalimentación de las respuestas.
- **RF-009:** Sistema de experiencia (XP).