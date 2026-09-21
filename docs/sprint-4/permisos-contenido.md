# Permisos de contenido — Sprint 4

## Objetivo

Dejar registrado qué consulta corresponde a cada permiso sobre el contenido
de LectoGo, para que QA pueda verificar los casos de autorización y
denegación durante el Sprint 4.

> Nota: el ERS define los roles y sus responsabilidades, pero la versión
> disponible no contiene una matriz detallada de permisos numerada como §2.7.
> Esta matriz traduce esas responsabilidades al alcance de Sprint 4 y se
> contrasta con las reglas y repositorios implementados.

---

## 1. Roles considerados

Los roles utilizados por LectoGo son:

- `estudiante`
- `docente`
- `administrador`
- `invitado`

El ERS establece que el estudiante puede leer textos y resolver actividades;
el docente puede crear lecturas, crear preguntas, asignar actividades y
consultar progreso; el administrador gestiona usuarios y contenido; y el
invitado puede consultar información pública.

---

## 2. Matriz de permisos del Sprint 4

| Rol           | Entidad       |                                 Consultar / leer |                     Crear |                 Editar |               Eliminar |
| ------------- | ------------- | -----------------------------------------------: | ------------------------: | ---------------------: | ---------------------: |
| Estudiante    | `lecturas`    |                          Sí, contenido publicado |                        No |                     No |                     No |
| Estudiante    | `preguntas`   | Sí, preguntas autorizadas sin respuesta correcta |                        No |                     No |                     No |
| Estudiante    | `actividades` |                   Sí, solo actividades asignadas |                        No |                     No |                     No |
| Estudiante    | `intentos`    |                         Sí, sus propios intentos |                      No\* |                     No |                     No |
| Docente       | `lecturas`    |                                               Sí |                        Sí | Sí, sobre su contenido | Sí, sobre su contenido |
| Docente       | `preguntas`   |                                               Sí |                        Sí | Sí, sobre su contenido | Sí, sobre su contenido |
| Docente       | `actividades` |                                               Sí | Mediante flujo autorizado | Sí, según autorización |     Según autorización |
| Docente       | `intentos`    |                     Sí, de estudiantes asignados |                      No\* |                     No |                     No |
| Administrador | `lecturas`    |                                               Sí |                        Sí |                     Sí |                     Sí |
| Administrador | `preguntas`   |                                               Sí |                        Sí |                     Sí |                     Sí |
| Administrador | `actividades` |                                               Sí |                        Sí |                     Sí |                     Sí |
| Administrador | `intentos`    |                                               Sí |                      No\* |                     No |                     No |
| Invitado      | `lecturas`    |                       Sí, solo contenido público |                        No |                     No |                     No |
| Invitado      | `preguntas`   |                                               No |                        No |                     No |                     No |
| Invitado      | `actividades` |                                               No |                        No |                     No |                     No |
| Invitado      | `intentos`    |                                               No |                        No |                     No |                     No |

\* Los documentos de `intentos` no son creados directamente por el cliente.
El registro del intento se realiza mediante la Cloud Function
`registrarIntento`.

---

## 3. Consultas implementadas en Sprint 4

### 3.1 Lecturas

Repository:

```text
src/repositories/lecturasRepository.js
```
