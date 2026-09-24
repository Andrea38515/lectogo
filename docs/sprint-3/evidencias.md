# Evidencias de verificación — Sprint 3

Tarjeta: `[Sprint 3 - 01] [01] QA: Verificar autenticación contra el proyecto Firebase oficial`

**Proyecto verificado**: `lectogo-586d4` (proyecto real del equipo — reemplaza a `lectogo-13eb8`, sin acceso de escritura).

**Fecha**: 2026-09-24

**Método**: flujo real desde la UI en `http://localhost:5174` (dev server), con una cuenta de prueba creada para esta verificación (`qa-email-verify-test@example.com`). Cuando el resultado depende de una respuesta de red que la UI no expone directamente (ej. envío de correo), se confirmó también con una llamada directa a la API REST de Firebase Identity Toolkit.

## RF-001 — Registro de usuarios

| Caso | Resultado observado |
|---|---|
| Registro exitoso | Formulario en `/registro` completado con nombre, correo y contraseña → redirige automáticamente al panel del estudiante. |
| Perfil creado con rol inicial | El doc `usuarios/{uid}` se crea vía la Cloud Function `onUserCreate` (no el cliente) con `rol: "estudiante"`, `xp: 0`, `nivel: 1`, `rachaActual: 0` — confirmado leyendo el doc por REST tras el registro. |
| Contraseña segura | `esPasswordSegura` en `src/utils/validators.js` exige mínimo 8 caracteres con letra y número; probado con contraseñas cortas, rechaza el envío. |
| Validación de correo | `sendVerificationEmail` (nuevo, `src/repositories/authRepository.js`) se invoca desde `register()` tras el `signUp()`. Registro real sin errores de consola — el envío no bloquea el flujo si falla. |

## RF-002 — Inicio de sesión

| Caso | Resultado observado |
|---|---|
| Login con error | Contraseña incorrecta → mensaje "Correo o contraseña incorrectos.", no autentica, permanece en `/login`. |
| Login correcto | Credenciales válidas → redirige al panel del estudiante con los datos reales del usuario (nombre, rol) visibles en Sidebar/Header. |
| Logout | Botón "Cerrar sesión" en el Sidebar → vuelve a `/login`; `/estudiante` vuelve a exigir sesión tras el logout. |

## RF-003 — Recuperación de contraseña

| Caso | Resultado observado |
|---|---|
| Solicitud de recuperación | Formulario en `/recuperar-password` con un correo registrado → mensaje "Si el correo existe, te enviamos un enlace para restablecer tu contraseña." Confirmado con la API REST (`accounts:sendOobCode`) devolviendo `200 OK`. |

## RF-004 — Gestión de perfil

| Caso | Resultado observado |
|---|---|
| Editar datos de perfil | Cambio de "Institución" en `/estudiante/perfil` → mensaje "Perfil actualizado correctamente."; confirmado que persiste tras recargar la página (leído de Firestore, no de caché local). |
| Cambiar contraseña | Formulario de cambio de contraseña con la contraseña actual + nueva → mensaje "Contraseña actualizada correctamente."; confirmado con logout + login usando la contraseña vieja (rechazado) y la nueva (aceptado). |

## Guards de rutas (RNF-004, verificado junto con esta tarea)

| Caso | Resultado observado |
|---|---|
| `/estudiante` sin sesión | Redirige a `/login`. |
| `/docente` sin sesión | Redirige a `/login`. |
| `/admin` sin sesión | Redirige a `/login`. |
| `/admin` con sesión de estudiante | Redirige a `/estudiante` (no muestra el panel de administrador). |

## Notas

- No se pudo confirmar la recepción real de los correos de verificación/recuperación en una bandeja de entrada, ya que las cuentas de prueba usan el dominio `@example.com` (no existe un buzón real). Se confirmó en su lugar que la API de Firebase acepta la solicitud (`200 OK`) sin errores.
- El registro/login se verificó también con un usuario creado directamente por API REST (sin pasar por la UI) para confirmar que el trigger `onUserCreate` funciona de forma aislada — ver tarjeta `[Sprint 1 - 01] [01]`.
