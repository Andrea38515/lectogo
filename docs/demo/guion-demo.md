# Guía de demostración de LectoGo

Esta guía acompaña a `scripts/demo/preparar-demo.cjs` y `scripts/demo/datos-demo.cjs`,
que dejan el proyecto `lectogo-586d4` listo para mostrar. No contiene contraseñas.

## Cómo levantar la aplicación

```bash
npm install
npm run dev
```

La aplicación abre en `http://localhost:5173` y usa el Firebase del proyecto (variables
en `.env`; ver `.env.example`).

## Cuentas de demostración

Todas usan correos `@example.com`, para no mostrar datos de personas reales.

| Rol | Cuenta | Nombre | Qué tiene |
| --- | --- | --- | --- |
| Estudiante | `demo-estudiante1` | Camila Demo | 4 actividades resueltas (210 XP, nivel 2, logros Primer paso y Perfeccionista). Pendiente: Juegos Olímpicos. |
| Estudiante | `demo-estudiante3` | Sofía Demo | 3 resueltas (110 XP, nivel 2). **Pendientes para resolver en vivo:** el faro de la isla y los Juegos Olímpicos. |
| Estudiante | `demo-estudiante4` | Lucas Demo | 2 resueltas (50 XP, nivel 1). Tres pendientes. |
| Estudiante | `demo-estudiante2` | Estudiante 1 | 1 resuelta (60 XP). Cuatro pendientes. |
| Docente | `demo-docente` | Profe Demo | Lectura propia publicada «Los volcanes» (3 preguntas) y las 6 actividades de demo. |
| Administrador | `demo-admin` | Admin Demo | Panel de categorías, usuarios y auditoría. |

Cada actividad de demo es de una lectura distinta, así que cada una da XP la primera vez.
Resolver otra actividad sobre una lectura ya resuelta da 0 XP (regla de XP una sola vez).
La actividad «El sistema solar (vencida)» está vencida a propósito.

## Recorrido sugerido (unos 12 minutos)

1. **Estudiante** (`demo-estudiante3`): dashboard, biblioteca, lectura, **resolver «El faro de la
   isla» en vivo**, resultados con el avance de XP, logros, ranking y estadísticas. El ranking usa
   alias («Lector XXXX»), nunca nombres.
2. **Docente** (`demo-docente`): Lecturas (mostrar «Los volcanes» y crear una nueva en borrador),
   Preguntas (agregar una a la lectura nueva, que debe estar fuera de «publicada»), Actividades
   (**asignar «Los volcanes» a dos correos demo, con fecha límite**), Progreso (ver quién resolvió
   cada actividad, con promedio, y descargar el CSV).
3. **Estudiante** otra vez: la actividad recién asignada aparece en «Actividades».
4. **Administrador** (`demo-admin`): Categorías (crear y eliminar una de prueba; intentar eliminar
   «Ciencia», que tiene lecturas), Usuarios (correos enmascarados por defecto; cambiar el rol de
   una cuenta demo y devolverlo) y **Auditoría** (cada acción deja su rastro).
5. **Seguridad** (de palabra o con el navegador): un estudiante que escribe `/docente` vuelve a su
   panel; la nota se calcula en el servidor y las respuestas correctas no viajan al navegador.

## Reiniciar entre ensayos

```bash
# vuelve a dejar las cuentas demo-estudiante* sin intentos, logros ni ranking
node scripts/demo/preparar-demo.cjs --project lectogo-586d4 --reiniciar --apply
# vuelve a cargar los datos de demostración
node scripts/demo/datos-demo.cjs --project lectogo-586d4 --apply
```

Ambos scripts hacen un simulacro si no se pasa `--apply`, y necesitan credenciales de
administrador (`GOOGLE_APPLICATION_CREDENTIALS`). Reiniciar solo toca las cuentas
`demo-estudiante*`: no modifica a QA ni a ningún otro usuario.

## Limitaciones conocidas para tener presentes

- El frontend corre en local; todavía no está publicado en un dominio propio.
- No hay reportes en PDF, tienda, monedas, mascota ni notificaciones (diferidos a la versión 2.0).
- Un docente asigna actividades escribiendo los correos de los estudiantes (no hay cursos con código).
