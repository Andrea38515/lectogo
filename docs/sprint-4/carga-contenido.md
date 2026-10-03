# Carga de contenido inicial - Sprint 4

## 1. Objetivo

Este documento describe la carga repetible del contenido inicial de LectoGo para development y staging.

El seed se encuentra en:

`docs/sprint-4/contenido-inicial.json`

El contenido utiliza únicamente identidades sintéticas y textos preparados para pruebas.

No ejecutar contra producción ni utilizar datos reales de menores.

## 2. Contrato S4-01

El contenido incluye:

- categorías;
- lecturas;
- preguntas;
- actividades;
- intentos.

Las lecturas incluyen:

- `id`
- `titulo`
- `contenido`
- `categoriaId`
- `nivelDificultad`
- `autorId`
- `estado`
- `creadoEn`

Los niveles utilizados son:

- `básico`
- `intermedio`
- `avanzado`

Los estados de las lecturas son:

- `borrador`
- `publicada`

## 3. Preguntas

Las preguntas utilizan los tipos:

- `seleccion_multiple`
- `verdadero_falso`

Cada pregunta contiene:

- `id`
- `lecturaId`
- `tipo`
- `enunciado`
- `opciones`
- `respuestaCorrecta`
- `explicacion`
- `autorId`

Todas las preguntas tienen explicación para permitir probar la retroalimentación.

## 4. Procedencia y licencia

Las lecturas del seed son contenido original creado para pruebas académicas de LectoGo.

Cada lectura registra:

- tipo de procedencia;
- autor;
- referencia;
- tipo de licencia;
- titular;
- condiciones de uso.

Para contenido externo se debe registrar:

1. fuente o URL;
2. autor o institución;
3. licencia;
4. fecha de consulta cuando corresponda;
5. condiciones de atribución.

## 5. IDs estables

Los IDs son deterministas y deben mantenerse durante las ejecuciones del seed.

Ejemplos:

```text
cat-cuentos
lec-s4-cuentos-01
preg-s4-cuentos-01-01
act-s4-basico-asignada
intento-s4-01-100