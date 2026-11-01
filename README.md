# LectoGo

LectoGo es una plataforma web de comprensión lectora con gamificación. Los docentes publican lecturas, arman preguntas y asignan actividades a sus estudiantes; los estudiantes leen, resuelven las actividades, ganan puntos de experiencia (XP), suben de nivel, mantienen una racha de lectura y desbloquean logros; los administradores gestionan categorías y usuarios y consultan un registro de auditoría. Proyecto desarrollado entre el 01/08/2026 y el 31/10/2026.

## Funcionalidades por rol

**Invitado (sin cuenta)**

- Consulta la biblioteca pública (`/biblioteca`) y lee las lecturas publicadas.

**Estudiante**

- Panel con nivel, XP, racha, actividades pendientes y resultados recientes.
- Biblioteca con búsqueda por palabra clave y filtro por categoría.
- Lectura con ajuste de tamaño del texto y barra de avance.
- Actividades asignadas con fecha límite; resultados con explicación de cada pregunta.
- Logros, ranking (por alias, nunca por nombre) y estadísticas de intentos.
- Perfil: nombre, institución, foto y cambio de contraseña.

**Docente**

- Lecturas: crear, editar y cambiar el estado (borrador, publicada, archivada).
- Preguntas: banco por lectura, de selección múltiple y de verdadero o falso, con explicación.
- Actividades: asignar una lectura publicada a estudiantes por correo, con fecha límite.
- Progreso: resultados por actividad, promedio y descarga en CSV.

**Administrador**

- Categorías: crear, editar y eliminar.
- Usuarios: listar, filtrar, buscar y cambiar roles (correos enmascarados por defecto).
- Auditoría: últimos 50 cambios sensibles de la plataforma.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19, React Router 7, react-icons |
| Empaquetado | Vite 8 |
| Datos y autenticación | Firebase Authentication, Cloud Firestore, Firebase Storage |
| Lógica de servidor | Cloud Functions (Node.js 22, `firebase-functions` 5, `firebase-admin` 12) |
| Calidad | ESLint 10 (frontend) y `node:test` (funciones) |

Las versiones exactas están en `package.json` y `functions/package.json`.

## Arquitectura

- **Frontend** (`src/`): páginas por rol, hooks que cargan y combinan datos, y repositorios que concentran el acceso a Firestore y a las Cloud Functions.
- **Cloud Functions** (`functions/`): son el único lugar donde se calculan la nota, el XP, el nivel, la racha, los logros y el ranking. El navegador nunca decide ninguno de esos valores.
- **Reglas de seguridad** (`firestore.rules`): definen qué puede leer y escribir cada rol. El rol se lee del documento `usuarios/{uid}.rol`, nunca de claims del token de autenticación.

| Función | Para qué sirve |
| --- | --- |
| `onUserCreate` | Crea el perfil del usuario al registrarse, siempre como `estudiante`. |
| `registrarIntento` | Califica en el servidor y aplica XP, nivel, racha, logros y ranking. |
| `asignarActividad` | Única vía para crear actividades; resuelve correos a estudiantes. |
| `cambiarRol` | Cambia el rol de un usuario y deja registro de auditoría. |
| `gestionarCategoria` | Crea, edita y elimina categorías con registro de auditoría. |

## Estructura del proyecto

```
lectogo/
├── src/                  Aplicación React
│   ├── pages/            Pantallas (auth, perfil, public, estudiante, docente, admin)
│   ├── layouts/          Estructuras de página por rol
│   ├── routes/           Rutas y guardas por rol
│   ├── components/       Componentes reutilizables
│   ├── hooks/            Carga y combinación de datos
│   ├── repositories/     Acceso a Firestore y a las funciones
│   ├── services/         Autenticación, perfil y almacenamiento
│   ├── utils/            Validaciones y utilidades puras
│   └── config/           Inicialización de Firebase
├── functions/            Cloud Functions y sus pruebas (functions/test)
├── scripts/              Carga de datos: seed, ranking y demo
├── docs/                 Documentación del proyecto
├── firestore.rules       Reglas de seguridad
├── firestore.indexes.json
└── firebase.json
```

## Requisitos e instalación

Requisitos: Node.js 22 y npm. Para desplegar, además, la CLI de Firebase y acceso al proyecto de Firebase.

1. Instale las dependencias del frontend:

```bash
npm install
```

2. Cree el archivo `.env` en la raíz a partir de `.env.example` y complete las seis variables con los datos de su aplicación web de Firebase:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=<valor>
VITE_FIREBASE_AUTH_DOMAIN=<valor>
VITE_FIREBASE_PROJECT_ID=<valor>
VITE_FIREBASE_STORAGE_BUCKET=<valor>
VITE_FIREBASE_MESSAGING_SENDER_ID=<valor>
VITE_FIREBASE_APP_ID=<valor>
```

El archivo `.env` está en `.gitignore` y no debe subirse al repositorio.

3. Inicie el servidor de desarrollo; la aplicación abre en `http://localhost:5173`:

```bash
npm run dev
```

Otros comandos del frontend:

| Comando | Descripción |
| --- | --- |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run build` | Genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la versión compilada. |

## Backend (Cloud Functions)

```bash
cd functions
npm install
npm test
```

El despliegue de funciones y reglas se hace con la CLI de Firebase desde la raíz del repositorio:

```bash
firebase deploy --only functions,firestore:rules --project <id-del-proyecto>
```

Las Cloud Functions requieren que el proyecto de Firebase esté en el plan Blaze. Los índices de Firestore se declaran en `firestore.indexes.json` (consultas de lecturas, de intentos por estudiante y del ranking).

## Datos y demostración

Los scripts de `scripts/` usan Firebase Admin, por lo que ignoran las reglas de seguridad y necesitan credenciales de administrador. Antes de ejecutarlos, instale las dependencias de `functions/` (de allí toman `firebase-admin`) y defina la variable de entorno que apunta a una clave de cuenta de servicio:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=<ruta-a-la-clave-de-servicio>.json
```

La clave de cuenta de servicio es una credencial sensible: no debe guardarse dentro del repositorio ni subirse nunca.

Todos los scripts funcionan en modo simulacro (no escriben nada) mientras no se agregue `--apply`.

| Script | Para qué sirve |
| --- | --- |
| `scripts/seed/seed.cjs` | Carga categorías, lecturas, preguntas, configuración de XP, niveles y logros. |
| `scripts/ranking/backfill.cjs` | Crea las filas de ranking de estudiantes que ya tenían intentos. |
| `scripts/demo/datos-demo.cjs` | Genera actividad resuelta para las cuentas de demostración. |
| `scripts/demo/preparar-demo.cjs` | Crea las actividades de demostración y reinicia las cuentas demo. |

Ejemplos:

```bash
node scripts/seed/seed.cjs
node scripts/seed/seed.cjs --apply --project <id-del-proyecto>
node scripts/demo/preparar-demo.cjs --project <id-del-proyecto> --apply
node scripts/demo/datos-demo.cjs --project <id-del-proyecto> --apply
```

Las cuentas de demostración usan correos `demo-*@example.com` (estudiantes, docente y administrador). El recorrido sugerido para la presentación está en `docs/demo/guion-demo.md`.

## Seguridad

- Las categorías solo se escriben mediante `gestionarCategoria`; el cliente no puede modificarlas, ni siquiera un administrador.
- Las actividades solo se crean mediante `asignarActividad`; el docente únicamente puede cambiar el estado de las suyas.
- Los intentos, los logros obtenidos y el ranking solo los escriben las funciones.
- La respuesta correcta y la explicación de cada pregunta se guardan en `preguntas/{id}/solucion`, que ningún estudiante puede leer; la calificación ocurre en el servidor.
- La colección `auditoria` solo la escriben las funciones y solo la lee un administrador.
- Un usuario solo puede editar su nombre, institución y foto; el rol, el XP y el nivel no son modificables desde el cliente.
- El ranking guarda únicamente un alias derivado del identificador (por ejemplo, `Lector 5R6Z`), nunca el nombre ni el correo.
- Toda colección no listada en las reglas queda cerrada por defecto.

## Pruebas

- **Funciones:** la suite de pruebas usa el ejecutor nativo `node:test` y se corre con `cd functions && npm test`. Cubre calificación, XP, niveles, racha, logros, ranking, asignación de actividades, cambio de roles y gestión de categorías.
- **Frontend:** no hay un ejecutor de pruebas configurado; se valida con `npm run lint` y con el recorrido manual descrito en `docs/demo/guion-demo.md`.

## Flujo de trabajo del equipo

- Commits con la convención de commits convencionales (`feat`, `fix`, `chore`, `docs`, `refactor`), con alcance entre paréntesis, por ejemplo `fix(admin): ...`.
- Ramas por tema con prefijo del tipo de cambio (`feat/...`, `fix/...`, `chore/...`, `docs/...`).
- Cada rama se integra a `main` mediante un pull request; se prefieren cambios pequeños y fáciles de revisar.

## Documentación

| Archivo | Contenido |
| --- | --- |
| `docs/LectoGo_Plan_de_Trabajo.docx` | Plan de trabajo del proyecto. |
| `docs/LectoGo_ERS.docx` | Especificación de requisitos de software. |
| `docs/LectoGo_DDS.docx` | Documento de diseño de software. |
| `docs/MANUAL_DE_USUARIO.md` | Manual de usuario con una sección por rol (fuente en Markdown). |
| `docs/MANUAL_DE_USUARIO.docx` | Versión en Word del manual. Se regenera con `python scripts/docs/md_a_docx.py docs/MANUAL_DE_USUARIO.md docs/MANUAL_DE_USUARIO.docx` (requiere `pip install python-docx`). |
| `docs/demo/guion-demo.md` | Guion y cuentas para la demostración. |
| `docs/sprint-3/` y `docs/sprint-4/` | Evidencias de los sprints y matriz de permisos de contenido. |
| `docs/Mapa_de_Pantallas_*.png` | Mapas de pantallas por rol. |

## Limitaciones conocidas

- El frontend no está publicado en un dominio propio: se ejecuta de forma local con `npm run dev`.
- No hay notificaciones, reportes en PDF, tienda, monedas, mascota ni cursos con código de acceso; las rutas de mascota y ajustes del estudiante muestran "Módulo en construcción".
- Los docentes asignan actividades escribiendo los correos de los estudiantes.
- Las funciones `asignarActividad`, `cambiarRol` y `gestionarCategoria` no tienen límite de frecuencia de llamadas ni App Check; se asume que solo las usan cuentas de confianza.
- Las reglas de Firebase Storage no están versionadas en este repositorio.
- Hay advertencias de lint conocidas que aún no se han corregido.
