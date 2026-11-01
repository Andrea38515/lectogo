# Cambios propuestos a los documentos de LectoGo

Revisión del Plan de Trabajo, el ERS y el DDS contra lo que **realmente se construyó y está
desplegado** (proyecto Firebase `lectogo-586d4`, rama `main`).

- **Fechas:** todas las del proyecto caen entre el 01/08/2026 y el 31/10/2026. No hay cambios de fechas.
- **Otros proyectos:** no hay menciones. No hay cambios por este motivo.
- Lo que sigue son desajustes de **contenido**: lo que el documento afirma y el sistema no hace así.

Cómo usar este archivo: cada punto trae `Texto actual` (copiado tal cual del documento, para
buscarlo con Ctrl+B en Word) y `Reemplazar por`. Los puntos están ordenados por documento.
Prioridad: **[A]** contradice lo construido (corregir antes de entregar) · **[M]** conviene alinear ·
**[O]** opcional, agrega algo que el documento no cubre.

> Ninguno de los `.docx` fue modificado: este archivo es solo una propuesta.

## Decisión previa que necesito de vos (afecta varios puntos)

El frontend **no está publicado**: la demo corre en local (`npm run dev`) contra el Firebase de
producción. Los puntos P-1, P-5, P-6, P-9 y D-8 dependen de eso. Redacté el texto para el caso
actual ("local"). Si antes de entregar publicás en Firebase Hosting, cambiá en esos puntos
"ejecución en local" por "publicada en Firebase Hosting (URL: ...)".

---

## 1. Plan de Trabajo (`LectoGo_Plan_de_Trabajo.docx`)

### P-1 [A] Despliegue en Vercel (sección 2.1 Entregables principales)
- **Texto actual:** `Aplicación web funcional (responsive, con React + Vite) desplegada en Vercel, con los 9 módulos del MVP descritos en el DDS.`
- **Reemplazar por:** `Aplicación web funcional (responsive, con React + Vite), con los 9 módulos del MVP descritos en el DDS, ejecutable en local y conectada al proyecto de Firebase lectogo-586d4. La publicación en un hosting público queda como siguiente paso.`

### P-2 [A] Firebase "plan gratuito/Spark" (sección 2.3 Supuestos y restricciones)
Cloud Functions exige el plan **Blaze** (pago por uso, con cuota gratuita mensual). El proyecto ya lo usa.
- **Texto actual:** `Firebase (plan gratuito/Spark) es suficiente para las necesidades de almacenamiento, autenticación y Cloud Functions del MVP.`
- **Reemplazar por:** `Cloud Functions requiere el plan Blaze de Firebase (pago por uso, con cuota gratuita mensual), que se activó para el proyecto. Authentication y Firestore operan dentro de la cuota gratuita en el volumen esperado del MVP.`

### P-3 [A] Herramientas "gratuitas" (sección 2.3 y de nuevo en 9.1 Desglose estimado de costos)
Aparece dos veces, con una diferencia mínima (`WhatsApp/Discord` y `WhatsApp`). Cambiar las dos.
- **Texto actual (2.3):** `No se requiere presupuesto económico adicional, ya que todas las herramientas usadas (GitHub, Figma, Firebase Spark, Vercel, WhatsApp/Discord) tienen planes gratuitos.`
- **Reemplazar por:** `No se requiere presupuesto económico adicional: las herramientas usadas (GitHub, Figma, Firebase, WhatsApp/Discord) tienen planes gratuitos o una cuota gratuita suficiente para el MVP. El plan Blaze de Firebase solo cobra el uso que exceda esa cuota.`
- **Texto actual (9.1):** `No se requiere presupuesto económico adicional, ya que todas las herramientas usadas (GitHub, Figma, Firebase Spark, Vercel, WhatsApp) tienen planes gratuitos.`
- **Reemplazar por:** el mismo texto de arriba, terminando en `(GitHub, Figma, Firebase, WhatsApp)`.

### P-4 [A] Dependencia de Vercel (sección 2.3, restricciones)
- **Texto actual:** `Dependencia de servicios en la nube (Firebase, Vercel) para el funcionamiento del backend y el despliegue del frontend.`
- **Reemplazar por:** `Dependencia de servicios en la nube (Firebase) para el funcionamiento del backend.`

### P-5 [A] Herramienta de despliegue (sección 5.2 Recursos técnicos y herramientas)
- **Texto actual:** `Vercel (build automático con vite build, preview deployments por Pull Request)`
- **Reemplazar por:** `Firebase CLI (despliegue de Cloud Functions y de las reglas de Firestore con firebase deploy)`

### P-6 [A] Riesgo de límites gratuitos (sección 6.1 Matriz de riesgos)
- **Texto actual (riesgo):** `Exceder los límites gratuitos de Firebase (Spark) por volumen de lecturas, intentos o llamadas a Cloud Functions.`
- **Reemplazar por:** `Exceder la cuota gratuita de Firebase (plan Blaze, pago por uso) por volumen de lecturas, intentos o llamadas a Cloud Functions.`
- **Texto actual (mitigación):** `Monitorear el uso desde el panel de Firebase durante staging; si se acerca al límite, evaluar migrar a Blaze (pago por uso) solo en producción.`
- **Reemplazar por:** `Monitorear el uso y el gasto desde la consola de Firebase y de Google Cloud, y configurar una alerta de presupuesto.`

### P-7 [A] Reglas probadas en "staging" (tres apariciones)
No existe entorno de staging: hay un único proyecto. Las reglas se compilan con
`firebase deploy --only firestore:rules --dry-run` antes de desplegar y se verifican después con cuentas de prueba por rol.
- **Texto actual (6.1 Matriz de riesgos):** `Probar las reglas contra la matriz de permisos del ERS (2.7) en el entorno de staging antes de cada despliegue a producción; revisión cruzada entre backend y Scrum Master.`
- **Reemplazar por:** `Probar las reglas contra la matriz de permisos del ERS (2.7): compilarlas con firebase deploy --only firestore:rules --dry-run antes de cada despliegue y verificarlas después con cuentas de prueba de cada rol; revisión cruzada entre backend y Scrum Master.`
- **Texto actual (7.1 Criterios de calidad):** `Las reglas de seguridad de Firestore se prueban en el entorno de staging antes de cualquier despliegue a producción.`
- **Reemplazar por:** `Las reglas de seguridad de Firestore se compilan con firebase deploy --dry-run antes de cada despliegue y se verifican después con cuentas de prueba de cada rol.`
- **Texto actual (10.2 Despliegue final):** `Despliegue final de las reglas de seguridad de Firestore a lectogo-prod, validadas previamente en staging.`
- **Reemplazar por:** `Despliegue final de las reglas de seguridad de Firestore al proyecto lectogo-586d4, compiladas previamente con firebase deploy --dry-run.`

### P-8 [A] Presupuesto: riesgo con Spark (9.1 Desglose estimado de costos)
- **Texto actual:** `Riesgo a vigilar: si el uso de Firebase excede el plan gratuito (Spark) durante producción, sería necesario evaluar el plan Blaze (pago por uso) — ver riesgo en la sección 6.1.`
- **Reemplazar por:** `Riesgo a vigilar: el plan Blaze de Firebase cobra por uso por encima de la cuota gratuita; se recomienda una alerta de presupuesto — ver riesgo en la sección 6.1.`

### P-9 [A] Verificación visual en el preview de Vercel (7.1 Criterios de calidad) y publicación (10.2 Despliegue final)
- **Texto actual:** `Cada Pull Request debe pasar la verificación visual en el preview deployment de Vercel en los tres tamaños de pantalla (escritorio, tablet, móvil) antes de aprobarse.`
- **Reemplazar por:** `Cada Pull Request debe pasar la verificación visual ejecutando la rama en local (npm run dev) en los tres tamaños de pantalla (escritorio, tablet, móvil) antes de aprobarse.`
- **Texto actual:** `Build de producción con vite build y publicación en Vercel (URL pública).`
- **Reemplazar por:** `Build de producción con vite build; la publicación en un hosting público queda como siguiente paso.`

### P-10 [M] Glosario (11.1): "Vercel" y "Preview deployment"
- **Texto actual:** las entradas `Vercel` y `Preview deployment` — `Despliegue temporal generado automáticamente por Vercel para cada Pull Request, con una URL propia de revisión.`
- **Cambio:** eliminar las dos entradas, o reemplazar la primera por `Firebase CLI: Herramienta de línea de comandos para desplegar Cloud Functions y reglas de Firestore.`

---

## 2. ERS (`LectoGo_ERS.docx`)

### E-1 [A] Regla de la racha (2.6.4 Rachas)
El sistema cuenta **días calendario** (zona horaria America/Bogotá), no ventanas de 24 horas.
- **Texto actual:** `Una racha se mantiene mientras el estudiante complete al menos una actividad dentro de un período de 24 horas contadas desde su última actividad registrada.`
- **Reemplazar por:** `Una racha se mantiene mientras el estudiante complete al menos una actividad cada día calendario (zona horaria America/Bogotá). Si completa una actividad el día siguiente al de su última actividad, la racha aumenta en 1. Completar varias actividades el mismo día no la modifica.`
- **Texto actual:** `Si transcurren 24 horas sin completar ninguna actividad, la racha se reinicia a 0.`
- **Reemplazar por:** `Si pasa al menos un día calendario completo sin actividad, la racha vuelve a 1 con la siguiente actividad completada.`
- **Texto actual:** `El sistema enviará una notificación recordatoria 2 horas antes de que expire la racha del día (ver RF-020).`
- **Reemplazar por:** `La notificación recordatoria antes de que expire la racha (ver RF-020) queda diferida a la versión 2.0.`
- **Texto actual:** `El contador de racha, así como los umbrales de bonos, son configurables por el Administrador.`
- **Reemplazar por:** `El contador de racha se calcula en el servidor y no es configurable en el MVP.`

### E-2 [A] XP por racha (2.6.1 Cálculo de XP, tabla de XP)
En el MVP la racha se registra y alimenta logros ("Tres días seguidos"), pero **no otorga XP**.
- **Filas actuales:** `Racha diaria (por cada día consecutivo con actividad)` = `+5 XP` · `Bono por racha semanal (7 días consecutivos)` = `+25 XP adicionales`
- **Reemplazar por:** mantener las filas pero agregar al final de cada nombre `(versión 2.0)` y, debajo de la tabla, la nota: `En el MVP la racha no otorga XP: se registra y se usa para los logros. El XP por racha queda para la versión 2.0.`

### E-3 [A] Niveles (2.6.3 Umbrales de nivel, tabla y texto)
Los umbrales sembrados difieren desde el nivel 4. Son:
0 · 100 · 250 · 500 · 900 · 1400 · 2000 · 2800.
- **Texto actual:** `El nivel del estudiante se determina por el XP acumulado total. A partir del nivel 6, el umbral crece aproximadamente al doble del nivel anterior; el Administrador podrá redefinir estos umbrales.`
- **Reemplazar por:** `El nivel del estudiante se determina por el XP acumulado total. Los umbrales se definen en la colección niveles_config de Firestore y pueden modificarse sin cambiar código; en el MVP no hay una pantalla para editarlos.`
- **Tabla actual:** `Nivel 1: 0 – 99 XP · Nivel 2: 100 – 249 XP · Nivel 3: 250 – 499 XP · Nivel 4: 500 – 999 XP · Nivel 5: 1000 – 1999 XP · Nivel 6 en adelante: Umbral anterior × 2 (configurable)`
- **Reemplazar por (tabla):**
  `Nivel 1: 0 – 99 XP · Nivel 2: 100 – 249 XP · Nivel 3: 250 – 499 XP · Nivel 4: 500 – 899 XP · Nivel 5: 900 – 1399 XP · Nivel 6: 1400 – 1999 XP · Nivel 7: 2000 – 2799 XP · Nivel 8 en adelante: 2800 XP o más`

### E-4 [A] "Parametrizables desde el panel de configuración" (2.6 Reglas de negocio, párrafo introductorio)
No existe un panel de configuración: los valores viven en `config_negocio` y `niveles_config`.
- **Texto actual:** `A continuación se proponen valores por defecto, razonables y parametrizables por el Administrador desde el panel de configuración, para el cálculo de XP, monedas, niveles y rachas. Estos valores no son fijos: deben poder ajustarse sin requerir cambios de código (RNF-008 Mantenibilidad).`
- **Reemplazar por:** `A continuación se proponen valores por defecto, razonables y parametrizables en las colecciones config_negocio y niveles_config de Firestore, para el cálculo de XP, niveles y rachas (las monedas quedan para la versión 2.0). Estos valores no son fijos: se ajustan sin requerir cambios de código (RNF-008 Mantenibilidad); en el MVP no hay pantalla para editarlos.`

### E-5 [O] XP una sola vez por lectura (agregar en 2.6.1, debajo de la tabla de XP)
Esta regla se implementó y no figura en el ERS.
- **Agregar:** `El XP se otorga una sola vez por estudiante y lectura. Si un estudiante resuelve otra actividad basada en una lectura con la que ya ganó XP, el intento se califica y se registra (y cuenta para la racha y los logros), pero no suma XP; la pantalla de resultados lo indica.`

### E-6 [A] RF-016, criterio de aceptación (3.1 Requisitos Funcionales)
No hay cursos: el docente asigna actividades escribiendo los correos de los estudiantes.
- **Texto actual:** `Docente solo ve y gestiona sus propios cursos/estudiantes.`
- **Reemplazar por:** `El docente solo ve y gestiona sus propias lecturas, preguntas y actividades, y el progreso de los estudiantes asignados a ellas. La asignación se hace por correo electrónico; los cursos con código quedan para la versión 2.0.`

### E-7 [A] RF-017, alcance (3.1 Requisitos Funcionales)
Implementado: usuarios (cambio de rol), categorías y auditoría. No hay moderación de contenidos ni estadísticas generales.
- **Texto actual:** `Descripción: Permitirá administrar usuarios, contenidos, estadísticas y categorías.`
- **Reemplazar por:** `Descripción: Permitirá administrar usuarios (cambio de rol), categorías y consultar el registro de auditoría. La moderación de contenidos y las estadísticas generales quedan para la versión 2.0.`
- El criterio `Acciones administrativas quedan registradas en auditoría.` **se cumple tal cual**: no cambiar.

### E-8 [A] RF-019, reportes (3.1 Requisitos Funcionales y 2.8.3 Funcionalidades de la Versión 2.0)
El ERS declara **RF-019 diferido a la versión 2.0** ("El panel con estadísticas en pantalla ya cubre la
necesidad inicial de seguimiento"), pero se implementó la exportación a CSV desde el panel docente.
Hay que reflejarlo en las dos secciones para que no se contradigan.
- **En 2.8.3 (fila "Docente/Admin · RF-019 Reportes exportables"), agregar al final de la razón:** `Excepción: la exportación a CSV de los resultados de una actividad se adelantó al MVP desde el panel docente; los reportes en PDF y por curso siguen para la versión 2.0.`
- **En 3.1, texto actual:** `Descripción: Permitirá exportar resultados por estudiante y curso.`
- **Reemplazar por:** `Descripción: Permitirá exportar los resultados de una actividad (por estudiante) a un archivo CSV desde el panel docente. La exportación por curso y en PDF queda para la versión 2.0.`
- **En 3.1, texto actual:** `Exportación en formato descargable (CSV/PDF).`
- **Reemplazar por:** `Exportación en formato descargable CSV, con una fila por estudiante asignado (nombre, correo, estado, porcentaje de aciertos, XP y fecha).`

---

### E-9 [M] Despliegue en Vercel (2.8.4 Nota técnica de implementación)
- **Texto actual (fragmento):** `... Authentication, Storage (solo si hay fotos de perfil) y despliegue en Vercel — puede reutilizarse prácticamente sin cambios.`
- **Reemplazar el fragmento** `y despliegue en Vercel` **por** `y el despliegue del frontend`.

---

## 3. DDS (`LectoGo_DDS.docx`)

### D-1 [A] Funciones callable (2.3.4 Capa de lógica de negocio — Cloud Functions)
`calcularXp`, `calcularNivel`, `calcularRacha` y `evaluarLogros` son funciones **internas** de `registrarIntento` (no callables), y `gestionarUsuario` y `actualizarRanking` no existen.
- **Texto actual:** `Funciones callable que concentran las reglas de negocio del ERS (sección 2.6): registrarIntento, calcularXp, actualizarNivel, evaluarLogros, actualizarRanking, asignarActividad y gestionarUsuario (ver detalle por módulo en la sección 3).`
- **Reemplazar por:** `Funciones callable que concentran las reglas de negocio del ERS (sección 2.6): registrarIntento (califica en el servidor y, en la misma transacción, calcula el XP, el nivel, la racha, los logros y la fila del ranking), asignarActividad, cambiarRol y gestionarCategoria; más el disparador onUserCreate (ver detalle por módulo en la sección 3).`

### D-2 [A] Registro: rol por defecto (3. Diseño de Módulos, MOD-01 Autenticación y cuentas)
`onUserCreate` siempre asigna `estudiante`; ignora lo que envíe el cliente (así nadie se asigna un rol al registrarse).
- **Texto actual:** `Cloud Functions asociadas: onUserCreate (crea el documento en usuarios/ y asigna el rol por defecto "estudiante" o el rol indicado en el registro institucional)`
- **Reemplazar por:** `Cloud Functions asociadas: onUserCreate (crea el documento en usuarios/ y asigna siempre el rol "estudiante"; los roles docente y administrador los asigna un administrador con cambiarRol)`

### D-3 [A] Ranking (3. Diseño de Módulos, MOD-06 Logros y ranking)
No hay job programado: la fila `ranking/{uid}` se escribe en la transacción de `registrarIntento` y la posición se calcula al leer.
- **Texto actual:** `Cloud Functions asociadas: evaluarLogros (revisa criterios tras cada intento), actualizarRanking (job programado que recalcula la vista de ranking)`
- **Reemplazar por:** `Cloud Functions asociadas: registrarIntento (evalúa los logros y actualiza la fila ranking/{uid} dentro de la misma transacción; no hay job programado). La posición se calcula al consultar: 1 + cantidad de filas con más XP + cantidad de filas con el mismo XP que lo alcanzaron antes.`
- **Texto actual:** `Colecciones / recursos utilizados: logros, logros_usuario, ranking (vista materializada)`
- **Reemplazar por:** `Colecciones / recursos utilizados: logros, logros_usuario, ranking/{uid} (alias, XP, nivel, logros y actividades; sin datos personales)`

### D-4 [A] Panel docente (3. Diseño de Módulos, MOD-07 Panel docente)
- **Texto actual:** `Cloud Functions asociadas: asignarActividad (valida que el docente sea autor del contenido antes de publicar)`
- **Reemplazar por:** `Cloud Functions asociadas: asignarActividad (solo rol docente: resuelve los correos a estudiantes, exige una lectura publicada y una fecha límite futura de máximo 730 días, y escribe en un solo lote la actividad, la subcolección actividades/{id}/asignados con nombre y correo, y una entrada de auditoría). Es la única vía para crear actividades.`
- **Texto actual:** `Colecciones / recursos utilizados: lecturas, preguntas, actividades, intentos (solo lectura de estudiantes asignados)`
- **Reemplazar por:** `Colecciones / recursos utilizados: lecturas, preguntas (y preguntas/{id}/solucion), actividades (y actividades/{id}/asignados), intentos (lectura de los de sus propias actividades), auditoria`

### D-5 [A] Panel administrador (3. Diseño de Módulos, MOD-08 Panel administrador)
El rol se lee del perfil (`usuarios/{uid}.rol`) en el servidor, **no de claims** del token.
- **Texto actual:** `Cloud Functions asociadas: gestionarUsuario (crear/editar/eliminar, aplica solo si el token tiene claim role=administrador)`
- **Reemplazar por:** `Cloud Functions asociadas: cambiarRol y gestionarCategoria (solo administrador: el rol se lee del perfil usuarios/{uid}.rol en el servidor, no de claims del token; un administrador no puede cambiar su propio rol; cada acción escribe una entrada en auditoria dentro de la misma transacción)`
- **Texto actual:** `Colecciones / recursos utilizados: usuarios, categorias, config_negocio, niveles_config`
- **Reemplazar por:** `Colecciones / recursos utilizados: usuarios, categorias, auditoria, config_negocio, niveles_config`

### D-6 [A] Modelo de datos: la respuesta correcta ya no está en `preguntas` (4. Modelo de Datos, colección `preguntas`)
Es un cambio de seguridad: `preguntas` lo lee cualquier usuario con sesión, y los estudiantes no deben ver la respuesta.
- **Filas actuales (tabla `preguntas`):** `respuestaCorrecta · string · Opción o valor correcto` y `explicacion · string · Explicación mostrada en la retroalimentación`
- **Cambio:** eliminar esas dos filas de la tabla `preguntas` y agregar una **colección nueva** (subcolección):
  `Colección: preguntas/{preguntaId}/solucion (documento fijo "datos")` — campos: `respuestaCorrecta (string): Opción o valor correcto` · `explicacion (string): Explicación mostrada en la retroalimentación`.
  Nota: `Solo la lee y escribe el docente autor de la pregunta o un administrador; los estudiantes no tienen acceso. La califica registrarIntento con el Admin SDK y devuelve la explicación después de enviar.`

### D-7 [A] Modelo de datos: colecciones que faltan (4. Modelo de Datos)
Agregar tres bloques nuevos con su tabla de campos:
- `Colección: ranking` (id = uid del estudiante): `estudianteId (string)`, `alias (string, "Lector XXXX")`, `xp (number)`, `nivel (number)`, `logros (number)`, `actividades (number)`, `actualizadoEn (timestamp)`. Nota: `Solo la escribe registrarIntento. No contiene nombre ni correo.`
- `Colección: actividades/{id}/asignados` (id = uid): `estudianteId (string)`, `nombre (string)`, `correo (string)`, `asignadoEn (timestamp)`. Nota: `Solo la lee el docente dueño de la actividad o un administrador; los estudiantes no ven a sus compañeros.`
- `Colección: auditoria`: `accion (string)`, `actorId (string)`, `objetivoId (string)`, `detalle (map)`, `creadoEn (timestamp)`. Nota: `Solo la escriben las Cloud Functions; solo la lee un administrador. Acciones: usuario.cambiar_rol, categoria.crear, categoria.editar, categoria.eliminar, actividad.asignar.`
- En la tabla `intentos`, agregar la fila: `lecturaId · string · Referencia a lecturas/{id}; permite otorgar XP una sola vez por estudiante y lectura`.

### D-8 [A] Entornos (8.1 Entornos)
Hay un único proyecto de Firebase.
- **Texto actual (tabla):** `Desarrollo · lectogo-dev · Pruebas locales del equipo durante el desarrollo de cada módulo.` / `Staging · lectogo-staging · Validación de integración antes de publicar a producción; datos de prueba.` / `Producción · lectogo-prod · Entorno con usuarios reales.`
- **Reemplazar por (una sola fila):** `Único (desarrollo y producción) · lectogo-586d4 · La aplicación se ejecuta en local y se conecta a este proyecto. Los datos de demostración usan cuentas demo-* con correos @example.com.`

### D-9 [A] CI/CD (8.2 Flujo de CI/CD, 8.3 Build y distribución y glosario)
- **Texto actual:** `Cada Pull Request contra la rama main genera automáticamente un preview deployment en Vercel (build con vite build) para revisión antes de aprobar el merge.`
  **Reemplazar por:** `Cada Pull Request contra la rama main se revisa antes del merge ejecutando la rama en local (npm run dev) y, en el caso del backend, con la suite de pruebas (cd functions && npm test).`
- **Texto actual:** `Al hacer merge a main, Vercel despliega automáticamente a producción.`
  **Reemplazar por:** `Tras el merge a main, las Cloud Functions y las reglas se despliegan con la Firebase CLI (firebase deploy --only functions,firestore:rules).`
- **Texto actual:** `Las claves de configuración de Firebase se gestionan como variables de entorno de Vercel (prefijo VITE_), nunca versionadas en el repositorio.`
  **Reemplazar por:** `Las claves de configuración de Firebase se gestionan como variables de entorno en el archivo .env (prefijo VITE_), nunca versionado en el repositorio.`
- **Texto actual:** `Las reglas de seguridad de Firestore se despliegan por separado con la Firebase CLI (firebase deploy --only firestore:rules) tras cada cambio, validándolas primero en el entorno de staging.`
  **Reemplazar por:** `Las reglas de seguridad de Firestore se despliegan con la Firebase CLI (firebase deploy --only firestore:rules) tras cada cambio, compilándolas primero con --dry-run y verificándolas después con cuentas de prueba de cada rol.`
- **Texto actual:** `Vercel construye la aplicación (vite build) y la publica en su CDN global. No se requiere configurar servidores ni pipelines de hosting propios.`
  **Reemplazar por:** `El frontend se construye con vite build; su publicación en un hosting público queda como siguiente paso.`
- **Glosario, texto actual:** `Preview deployment: Despliegue temporal generado automáticamente por Vercel para cada Pull Request, con una URL propia de revisión.` → **eliminar** la entrada.

### D-10 [A] Índices (4.2 Índices recomendados)
- **Texto actual:** `usuarios: índice por (rol, xp) descendente para construir el ranking.`
- **Reemplazar por:** `ranking: índice compuesto por xp (descendente) y actualizadoEn (ascendente), para calcular la posición y el desempate. intentos: índice por estudianteId y resueltoEn (descendente). lecturas: índice por categoriaId y nivelDificultad.`

### D-11 [M] Reglas de seguridad (6.2 Reglas de seguridad de Firestore, resumen)
Verificar que el fragmento de reglas del documento refleje lo actual, o agregar estas líneas al resumen:
- `categorias: lectura pública; escritura cerrada a los clientes (solo gestionarCategoria, con el Admin SDK).`
- `actividades: el cliente no crea ni borra; el docente dueño solo puede cambiar el campo estado. Solo asignarActividad crea actividades.`
- `auditoria: lectura solo para administradores; nadie escribe desde el cliente.`
- `preguntas/{id}/solucion: lectura y escritura solo del docente autor o un administrador.`
- `usuarios: el cliente solo puede modificar nombre, institucion y fotoUrl; el rol solo cambia con cambiarRol.`

---

## Resumen

| Documento | Puntos [A] | Puntos [M] | Puntos [O] |
| --- | --- | --- | --- |
| Plan de Trabajo | P-1 a P-9 | P-10 | — |
| ERS | E-1 a E-4, E-6 a E-8 | E-9 | E-5 |
| DDS | D-1 a D-10 | D-11 | — |

Lo más importante a corregir antes de entregar: **Vercel y staging** (P-1, P-4, P-5, P-7, P-9, D-8, D-9),
**Spark** (P-2, P-3, P-6, P-8), **la regla de la racha** (E-1), **los niveles** (E-3) y
**la respuesta correcta fuera de `preguntas`** (D-6), porque describe una decisión de seguridad.


---

## Copias editadas (ya generadas)

Se generaron tres copias con todos los cambios de arriba aplicados. Los originales no se tocaron.

| Original | Copia editada |
| --- | --- |
| `LectoGo_Plan_de_Trabajo.docx` | `LectoGo_Plan_de_Trabajo_editado.docx` |
| `LectoGo_ERS.docx` | `LectoGo_ERS_editado.docx` |
| `LectoGo_DDS.docx` | `LectoGo_DDS_editado.docx` |

Los cambios se hicieron sobre el XML del documento, conservando estilos, tablas y la tipografía
monoespaciada del extracto de reglas. **No tienen control de cambios activado**: para ver qué cambió, en Word usá
*Revisar → Comparar → Comparar...* eligiendo el original y la copia editada.

### Cambios adicionales aplicados en las copias (no estaban en el listado de arriba)

Al validar las copias aparecieron más desajustes del mismo tipo y se corrigieron:

- **DDS 6.1 (Autenticación y roles):** decía que el rol vive también en un *custom claim* del token. Ahora dice que vive solo en `usuarios/{uid}.rol` y que las reglas y las funciones lo leen de ahí.
- **DDS 6.2 (extracto de reglas):** el extracto usaba `request.auth.token.role`. Se reescribió con el modelo real (`esAdmin()`, `esDocente()`, `rolActual()`), y se agregaron las notas de resumen de `categorias`, `actividades`, `auditoria`, `solucion` y `usuarios` (D-11).
- **DDS glosario:** se eliminó la entrada "Custom claim", el acrónimo "Claim" y "Preview deployment", y "Vista materializada (ranking)" pasó a "Ranking (fila materializada)".
- **DDS MOD-04 y MOD-05:** `registrarIntento` ahora lee las respuestas de `preguntas/{id}/solucion`; `calcularXp` y `calcularNivel` figuran como funciones internas, no como callables.
- **DDS RNF-010 (auditoría):** nombraba `gestionarUsuario`; ahora `cambiarRol`, `gestionarCategoria` y `asignarActividad`.
- **DDS diagrama de secuencia de `registrarIntento`:** `actualizarNivel` pasó a `calcularNivel` y se menciona la fila `ranking/{uid}`.

### Cómo se verificaron las copias
- Cada texto a cambiar se buscó de forma **exacta** en el documento antes de escribir; si alguno no existía, no se escribía nada.
- Las tres copias se abren sin error con `python-docx`, el ZIP es válido y no quedan identificadores internos repetidos.
- Se comparó el texto de cada copia con el original: solo cambian las líneas de este listado.
- No quedan menciones a Vercel, Spark, staging, `lectogo-dev`, `lectogo-prod`, `gestionarUsuario`, `actualizarRanking`, `actualizarNivel` ni a las 24 horas de la racha.
- Las fechas del proyecto no cambiaron; los demás años que aparecen son normas y leyes (IEEE 830-1998, IEEE 1016-2009, ISO 29148:2018, Ley 1581 de 2012, Decreto 1377 de 2013).
- **No se pudo abrir en Word** (no hay Word ni LibreOffice en esta máquina): conviene abrir cada copia una vez para revisar el aspecto, sobre todo las tablas nuevas del DDS y el extracto de reglas.
