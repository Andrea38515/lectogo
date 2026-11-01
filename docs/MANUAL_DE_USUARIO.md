# Manual de usuario de LectoGo

Plataforma web de comprensión lectora con gamificación

Versión 1.0

Agosto a octubre de 2026

## 1. Introducción

LectoGo es una plataforma web para practicar la comprensión lectora. Los docentes publican lecturas, preparan preguntas y asignan actividades; los estudiantes leen, resuelven las actividades y obtienen puntos de experiencia, niveles, una racha de lectura y logros; los administradores mantienen las categorías y los usuarios y consultan un registro de los cambios importantes.

Este manual explica, paso a paso, cómo usar la plataforma según el rol de cada persona. Los textos de botones, menús, títulos y mensajes que aparecen en la pantalla se citan en **negrita** y exactamente como se ven en la aplicación, para que pueda reconocerlos. La interfaz usa un tono cercano (por ejemplo, **Creá** o **Elegí**); en este manual se conserva ese texto tal cual cuando se cita.

### 1.1 Roles y qué puede hacer cada uno

| Rol | Qué puede hacer |
| --- | --- |
| Invitado | Consultar la biblioteca pública y leer las lecturas publicadas, sin iniciar sesión. |
| Estudiante | Leer, resolver las actividades que le asignan, ver sus logros, su ranking y sus estadísticas, y editar su perfil. |
| Docente | Crear y administrar sus lecturas y preguntas, asignar actividades a estudiantes y consultar su progreso. |
| Administrador | Gestionar categorías y usuarios, cambiar roles y consultar la auditoría. |

### 1.2 Dispositivos y navegadores

LectoGo se adapta al tamaño de la pantalla y puede usarse en computador, tableta y teléfono móvil, con un navegador web actualizado. En el área del estudiante, las pantallas anchas muestran un menú lateral y las pantallas estrechas (menos de 768 píxeles de ancho) muestran una barra de navegación inferior.

### 1.3 Cómo abrir la aplicación

Por ahora la aplicación no está publicada en un dominio propio: el equipo la ejecuta de forma local con el comando `npm run dev`. Una vez iniciada, se abre en un navegador en la dirección `http://localhost:5173`. La página inicial lleva a la pantalla de inicio de sesión.

## 2. Primeros pasos (todos los roles)

### 2.1 Crear una cuenta

Cualquier persona puede registrarse. Las cuentas nuevas son siempre de estudiante: los roles de docente y de administrador los asigna una persona con rol de administrador (consulte la sección 5.3).

1. En la pantalla de inicio de sesión, seleccione el enlace **Registrate**.
2. Complete los campos **Nombre**, **Correo**, **Contraseña** y **Confirmar contraseña**.
3. Seleccione **Crear cuenta**. Mientras se procesa, el botón dice **Creando cuenta...**.
4. Al terminar, la aplicación lo lleva al panel del estudiante. Además, se envía un correo de verificación a su dirección; no es necesario abrirlo para usar la plataforma.

Validaciones y mensajes del formulario:

| Situación | Mensaje que aparece |
| --- | --- |
| Nombre vacío | **El nombre es obligatorio.** |
| Correo con formato incorrecto | **Ingresá un correo válido.** |
| Contraseña sin 8 caracteres, letras y números | **La contraseña debe tener al menos 8 caracteres, con letras y números.** |
| Las dos contraseñas son distintas | **Las contraseñas no coinciden.** |
| El correo ya está registrado | **Ya existe una cuenta con ese correo.** |

Si ya tiene cuenta, seleccione el enlace **Ya tengo cuenta** para volver al inicio de sesión.

### 2.2 Iniciar sesión

1. Abra la pantalla **Iniciar sesión** (subtítulo **Ingresá a tu cuenta para continuar**).
2. Escriba su **Correo electrónico** y su **Contraseña**. El botón con forma de ojo, dentro del campo de contraseña, permite mostrarla u ocultarla.
3. Seleccione **Iniciar sesión**.

La aplicación lo lleva automáticamente al panel de su rol: estudiante, docente o administrador.

| Situación | Mensaje que aparece |
| --- | --- |
| Algún campo vacío | **Por favor, completá todos los campos.** |
| Correo con formato incorrecto | **Ingresá un correo electrónico válido.** |
| Datos incorrectos | **Correo o contraseña incorrectos.** |
| Demasiados intentos fallidos | **Demasiados intentos. Esperá unos minutos e intentá de nuevo.** |
| La cuenta no tiene perfil | **No existe información de tu cuenta. Contactá al administrador.** |

Si una persona intenta abrir la dirección del área de docente o de administrador sin tener ese rol (por ejemplo, un estudiante escribe `/docente`), la aplicación la devuelve a su propio panel. Es un comportamiento normal de seguridad.

### 2.3 Recuperar la contraseña

1. En el inicio de sesión, seleccione **¿Olvidaste tu contraseña?**.
2. Escriba su **Correo** y seleccione **Enviar enlace**.
3. Aparece el mensaje **Si el correo existe, te enviamos un enlace para restablecer tu contraseña.** Abra el correo y siga el enlace para elegir una contraseña nueva.
4. Para regresar, seleccione **Volver a iniciar sesión**.

### 2.4 Cerrar sesión

- Estudiante: seleccione **Cerrar sesión**, al final del menú lateral.
- Docente y administrador: seleccione **Cerrar sesión**, en la esquina superior derecha de la barra superior.

Importante: en pantallas estrechas (menos de 768 píxeles) el menú lateral del estudiante no se muestra y la barra inferior no incluye **Cerrar sesión**. Para cerrar la sesión de un estudiante, use una ventana o un dispositivo más ancho.

### 2.5 Perfil

La pantalla del perfil se abre desde la opción **Perfil** del menú del estudiante o seleccionando su nombre en la parte superior del panel del estudiante. En los paneles de docente y de administrador no hay un enlace al perfil.

En la sección **Mi perfil** puede cambiar:

- **Nombre**, que es obligatorio. Si lo deja vacío aparece **El nombre es obligatorio.**
- **Institución**, que es opcional.
- **Foto de perfil**, que se elige como un archivo de imagen.

Seleccione **Guardar cambios** (mientras guarda dice **Guardando...**). Si todo sale bien aparece **Perfil actualizado correctamente.** El correo y el rol no se pueden editar desde esta pantalla.

En la sección **Cambiar contraseña**:

1. Escriba la **Contraseña actual**.
2. Escriba la **Contraseña nueva** y repítala en **Confirmar contraseña nueva**. Debe tener al menos 8 caracteres, con letras y números.
3. Seleccione **Cambiar contraseña**. Si todo sale bien aparece **Contraseña actualizada correctamente.**

### 2.6 Biblioteca pública (sin iniciar sesión)

Cualquier persona puede consultar la biblioteca pública en la dirección `http://localhost:5173/biblioteca`. La pantalla se titula **Biblioteca LectoGo** y muestra tarjetas con la categoría, el nivel y el título de cada lectura publicada.

1. Seleccione **Leer** en la tarjeta de la lectura que le interese.
2. Lea el texto. Con **A-**, **A** y **A+** puede cambiar el tamaño de la letra.
3. Seleccione **← Volver** o **← Biblioteca** para regresar a la lista.

Un invitado solo puede leer: no puede resolver actividades ni ganar puntos. Si no hay lecturas aparece **Aún no hay lecturas disponibles**; si falla la carga aparece **No se pudo cargar la biblioteca** con el botón **Intentar nuevamente**.

## 3. Manual del estudiante

### 3.1 Acceso y menú

Inicie sesión con su cuenta (sección 2.2). En pantallas anchas el menú lateral tiene estas opciones: **Inicio**, **Biblioteca**, **Actividades**, **Mi progreso**, **Logros**, **Ranking** y **Perfil**. En pantallas estrechas, la barra inferior muestra **Inicio**, **Biblioteca**, **Actividades**, **Ranking** y **Perfil**; los logros y las estadísticas se alcanzan desde los accesos del panel de inicio.

En la parte superior hay un ícono de campana con el nombre **Notificaciones**. Las notificaciones todavía no están disponibles, por lo que ese botón no realiza ninguna acción.

### 3.2 Panel de inicio

El panel de inicio (**PANEL DEL ESTUDIANTE**) saluda con su nombre y reúne su avance:

- **Tu nivel**, con el nivel actual.
- Cuatro tarjetas: **Actividades** (total asignadas), **Completadas**, **Progreso** (porcentaje de actividades completadas) y **Logros** (cantidad desbloqueados).
- **Mis actividades**: hasta tres actividades pendientes, ordenadas por fecha límite, con el botón **Resolver**. Si una actividad pasó su fecha límite se marca como **Vencida** y el botón cambia a **Ver actividad**. El enlace **Ver todas** abre la lista completa y, si hay más, aparece un enlace del tipo **Y 2 más por resolver**.
- **Mi progreso**: **Actividades realizadas**, **Promedio de aciertos**, **Experiencia** (XP), **Racha actual** y una barra que muestra cuánta experiencia falta para el siguiente nivel.
- **Resultados recientes**: sus últimas tres actividades resueltas, con el botón **Revisar** y el enlace **Ver estadísticas**.
- **Accesos rápidos** a **Biblioteca**, **Actividades** y **Mis logros**.

Si todavía no tiene actividades asignadas aparece **Aún no tienes actividades asignadas. Mientras tanto, explora la biblioteca y empieza a leer.** con el botón **Ir a la biblioteca**.

### 3.3 Biblioteca

La pantalla **Mi biblioteca** lista todas las lecturas publicadas. Arriba muestra el número de **Recursos** y de **Categorías**.

Para buscar y filtrar:

1. Escriba en el cuadro **Buscar por palabra clave...**. La búsqueda ignora mayúsculas y tildes y revisa el título, el comienzo del texto y la categoría. El botón **×** limpia la búsqueda.
2. Seleccione una categoría en los botones de filtro. **Todos** muestra todas las lecturas.
3. Cuando hay filtros activos aparece la cantidad de resultados.

Si nada coincide aparece **No encontramos lecturas** con el botón **Ver todas las lecturas**, que quita los filtros. Para abrir una lectura, seleccione la flecha (→) de su tarjeta.

### 3.4 Leer una lectura

La pantalla de lectura muestra la categoría, el título y el **Nivel** de dificultad.

- **Tamaño del texto:** use **A-**, **A** y **A+** para reducir o ampliar la letra.
- Una barra en la parte superior muestra cuánto del texto ha recorrido.
- Al llegar casi al final aparece **✓ Has avanzado hasta el final de la lectura.**
- Seleccione **← Volver** o **← Biblioteca** para regresar.

Leer no suma puntos por sí mismo: los puntos se obtienen al resolver una actividad.

Si la lectura no existe o dejó de estar publicada aparece **Lectura no disponible**.

### 3.5 Mis actividades

La opción **Actividades** muestra las actividades que su docente le asignó. Cada tarjeta indica el título de la lectura y su categoría. Puede buscar con **Buscar actividad...** y filtrar por categoría (**Todas** quita el filtro). La tarjeta también muestra una etiqueta de dificultad y una duración que son valores genéricos y no dependen de la lectura.

Estados que puede ver:

| Estado | Dónde se ve | Qué significa |
| --- | --- | --- |
| Pendiente | Botón **Comenzar actividad** | Aún no la ha resuelto y puede hacerlo. |
| Completada | Marca **✓ Completada** y botón **Ver resultados** | Ya la resolvió; puede revisar sus resultados. |
| Vencida | Marca **Vencida** en el panel de inicio | Pasó la fecha límite sin resolverse; el servidor ya no acepta envíos. |
| Cerrada | Mensaje **Actividad cerrada** | La actividad ya no está disponible para resolverse. |

La lista de actividades no marca las vencidas: para ver la fecha límite abra la actividad o revise el panel de inicio.

### 3.6 Resolver una actividad

1. En **Actividades**, seleccione **Comenzar actividad** (o **Resolver** desde el panel de inicio).
2. Lea el encabezado: título, **Nivel** y **Fecha límite**. Si la fecha ya pasó según la hora de su dispositivo aparece un aviso; aun así puede intentar enviar y el sistema le indicará si el plazo terminó.
3. Lea el texto, en la sección **Lectura**.
4. Responda cada **Pregunta** eligiendo una opción. El contador muestra, por ejemplo, **2 de 4** respondidas.
5. Cuando haya respondido todas, seleccione **Enviar respuestas**. Mientras no responda todas, el botón permanece deshabilitado y se muestra **Responde todas las preguntas para poder enviar.**

Reglas importantes:

- Cada actividad se resuelve una sola vez. Si se vuelve a enviar, aparece **Ya habías resuelto esta actividad antes. Estos son tus resultados originales.**
- La calificación la hace el servidor, no su navegador; las respuestas correctas nunca se envían a su dispositivo antes de que usted conteste.
- Si falla el envío por la conexión, sus respuestas siguen en pantalla para reintentar. Si la actividad cambió mientras la resolvía, use el botón **Recargar actividad**.

### 3.7 Resultados de una actividad

Al enviar, la pantalla **Resultados** muestra:

- El **porcentaje de aciertos**, las **respuestas correctas** (por ejemplo, 3/4) y los **XP ganados**.
- Si corresponde, el mensaje **¡Subiste al nivel N!** junto con **Ya acumulas X XP.**
- Si desbloqueó logros, el título **Logro desbloqueado** o **Logros desbloqueados** con el nombre y la descripción de cada uno.
- Los totales **Llevas X XP en total** y **Racha: N días**.
- La **Revisión de respuestas**: para cada pregunta, **Tu respuesta**, si fue **¡Respuesta correcta!** o **Respuesta incorrecta**, y la explicación cuando el docente la escribió.

Si ya había ganado XP con esa misma lectura en otra actividad, aparece el aviso **Ya habías ganado XP con esta lectura, por eso esta vez no suma. Tu resultado y tu racha sí quedan registrados.**

Desde esta pantalla puede seguir con **Volver a mis actividades** o **Ver mis estadísticas**. Más adelante puede reabrir una actividad completada con **Ver resultados** para repasar sus respuestas (la celebración de nivel y logros solo se muestra en el momento del envío).

### 3.8 Cómo funciona la gamificación

Los valores de esta sección son los que carga el script de datos iniciales del proyecto; un administrador del sistema puede ajustarlos en la base de datos.

**Puntos de experiencia (XP).** Cada respuesta correcta suma 10 XP. Si acierta el 100 % de las preguntas de la actividad se suman además 20 XP de bono. Por ejemplo, una actividad de 4 preguntas con todas correctas da 4 por 10 más 20, es decir 60 XP; con 3 correctas da 30 XP.

**Una sola vez por lectura.** Solo se gana XP la primera vez que obtiene puntos con una lectura. Si un docente le asigna otra actividad sobre la misma lectura, esa actividad se califica y cuenta para su racha y sus logros, pero suma 0 XP. Un intento en el que no acertó ninguna pregunta no gasta esa oportunidad.

**Niveles.** Su nivel depende de su XP total:

| Nivel | XP mínimo |
| --- | --- |
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| 6 | 1400 |
| 7 | 2000 |
| 8 | 2800 |

**Racha.** La racha cuenta días de calendario consecutivos con al menos una actividad resuelta, según la hora de Colombia (zona horaria America/Bogota). Si resuelve varias actividades el mismo día, la racha no cambia; si resuelve una al día siguiente, suma 1; si pasa un día sin resolver ninguna, vuelve a 1 en su próxima actividad. En el panel de inicio se muestra 0 cuando su última actividad no fue hoy ni ayer. Leer no actualiza la racha.

**Logros.** Se desbloquean automáticamente al resolver actividades:

| Logro | Cómo se obtiene |
| --- | --- |
| **Primer paso** | Completar su primera actividad. |
| **Lector constante** | Completar cinco actividades. |
| **Perfeccionista** | Responder bien todas las preguntas de una actividad. |
| **Tres días seguidos** | Alcanzar una racha de 3 días. |
| **Una semana de lectura** | Alcanzar una racha de 7 días. |

Los logros y la racha se evalúan en cada actividad resuelta, incluso cuando ese intento no suma XP.

### 3.9 Logros

La pantalla **Mis logros** muestra **N de M logros desbloqueados** con una barra de avance. Los logros se agrupan en **Desbloqueados** (con la fecha en que los obtuvo) y **Por desbloquear** (con una barra de avance cuando se puede calcular). Si todavía no tiene ninguno aparece **Aún no has desbloqueado ningún logro. Resuelve una actividad para empezar.**

### 3.10 Ranking

La pantalla **Ranking** ordena a los estudiantes por XP. Cada persona aparece con un alias del tipo **Lector 5R6Z**, nunca con su nombre. Si dos estudiantes tienen los mismos XP, queda arriba quien los alcanzó primero.

- **Tu posición** muestra su puesto, su alias, sus XP, su nivel y sus logros, marcados con **Tú**.
- **Mejores posiciones** muestra un podio con los tres primeros y una lista hasta el puesto 20. Si usted está más abajo, su fila aparece al final de la lista.
- Solo aparece en el ranking quien ya resolvió al menos una actividad; antes verá **Resuelve tu primera actividad para entrar al ranking.**

### 3.11 Estadísticas

La opción **Mi progreso** del menú abre la pantalla **Estadísticas**. Muestra las tarjetas **Porcentaje de aciertos**, **Actividades completadas** e **Intentos registrados**, y el **Historial de actividades** de la más reciente a la más antigua, con aciertos, porcentaje y fecha. El selector **Filtrar** ofrece **Todos**, **Completadas** y **Pendientes**; como el historial solo contiene actividades resueltas, la opción **Pendientes** no muestra resultados.

## 4. Manual del docente

### 4.1 Acceso

Inicie sesión con una cuenta de docente (la asigna un administrador). La aplicación abre el panel docente, cuya barra superior tiene las secciones **Inicio**, **Lecturas**, **Preguntas**, **Actividades** y **Progreso**, y el botón **Cerrar sesión**.

### 4.2 Inicio

La pantalla de inicio saluda con **¡Hola, nombre!** y ofrece cuatro tarjetas de acceso directo: **Lecturas** (**Creá y organizá los textos que leerán tus estudiantes.**), **Preguntas** (**Armá el banco de preguntas de comprensión lectora.**), **Actividades** (**Combiná lecturas y preguntas en actividades para asignar.**) y **Progreso** (**Seguí cómo avanzan tus estudiantes.**).

### 4.3 Lecturas

La sección **Lecturas** muestra solo las lecturas que usted creó. Cada tarjeta indica la categoría, el estado (**Borrador**, **Publicada** o **Archivada**), el título y el nivel.

Estados de una lectura:

| Estado | Significado |
| --- | --- |
| Borrador | En preparación. Los estudiantes no la ven. Es el estado en que se pueden agregar y eliminar preguntas. |
| Publicada | Visible en la biblioteca para estudiantes e invitados. Es el único estado que permite asignarla en una actividad. |
| Archivada | Retirada de la biblioteca. Se conserva para poder publicarla de nuevo. |

Para crear una lectura:

1. Seleccione **Nueva lectura**.
2. Escriba el **Título** (entre 3 y 120 caracteres).
3. Elija la **Categoría** (la lista **Elegí una categoría** contiene las categorías creadas por el administrador).
4. Elija el **Nivel de dificultad**: **Fácil**, **Medio** o **Difícil**.
5. Escriba el **Texto de la lectura** (mínimo 50 y máximo 20000 caracteres; un contador le indica cuántos lleva). Separe los párrafos con una línea en blanco.
6. Elija el **Estado**. Se recomienda **Borrador** mientras prepara las preguntas.
7. Seleccione **Crear lectura**. Aparece **Creamos la lectura.**

Para editar, seleccione **Editar** en la tarjeta, cambie lo necesario y seleccione **Guardar cambios**. Aparece **Guardamos los cambios de la lectura.**

Para cambiar el estado sin abrir el formulario, use los botones de la tarjeta: en un borrador, **Publicar** y **Archivar**; en una publicada, **Pasar a borrador** y **Archivar**; en una archivada, **Publicar** y **Pasar a borrador**.

Confirmación al sacar una lectura de **Publicada**: si usa **Pasar a borrador** o **Archivar** en una lectura publicada, la tarjeta muestra **Si la lectura ya está en una actividad, los estudiantes no podrán abrirla.** con los botones **Confirmar:** (seguido de la acción elegida) y **Cancelar**. Piénselo antes de confirmar, porque las actividades que usan esa lectura quedan imposibles de abrir.

### 4.4 Preguntas

La sección **Preguntas** (**Banco de preguntas**) lista sus lecturas. Las preguntas se administran por lectura.

1. Seleccione **Administrar preguntas** en la lectura que desea trabajar (también puede usar el botón **Preguntas** de la tarjeta en **Lecturas**).
2. Seleccione **Nueva pregunta**.
3. En **Tipo de pregunta** elija **Selección múltiple** o **Verdadero o falso**. El tipo no se puede cambiar después de crear la pregunta.
4. Escriba el **Enunciado** (entre 5 y 500 caracteres).
5. En selección múltiple, complete de 2 a 4 opciones (**Opción 1**, **Opción 2**, ...). Use **Agregar opción** para añadir y **Quitar** para eliminar. Las opciones no pueden repetirse ni estar vacías. En verdadero o falso las opciones son siempre **Verdadero** y **Falso**.
6. En **Respuesta correcta**, marque cuál es la opción correcta.
7. Si lo desea, escriba la **Explicación (opcional)**, de hasta 500 caracteres. Se la mostramos al estudiante después de responder.
8. Seleccione **Crear pregunta**. Aparece **Creamos la pregunta.**

Para modificar una pregunta, seleccione **Editar**, cambie lo necesario y use **Guardar cambios**. Para borrarla, seleccione **Eliminar** y confirme con **Confirmar: eliminar** (el aviso dice **Vas a eliminar la pregunta y su respuesta. No se puede deshacer.**).

Solo puede agregar o eliminar preguntas mientras la lectura no esté publicada. La razón es que un estudiante podría estar resolviendo la actividad en ese momento y el sistema exige responder todas las preguntas de la lectura; sumar o quitar una a mitad de camino le impediría enviar. Con la lectura publicada la pantalla muestra **Esta lectura está publicada: para agregar o eliminar preguntas pasala primero a borrador desde Lecturas.** Editar el texto o la respuesta de una pregunta existente sí está permitido; los intentos que ya se resolvieron conservan su calificación.

Una pregunta marcada con **Sin respuesta cargada** no tiene respuesta correcta guardada y debe corregirse con **Editar**.

### 4.5 Actividades

Una actividad vincula una lectura publicada con un grupo de estudiantes y una fecha límite. La lista **Actividades** muestra cada una con su estado (**Vigente**, **Vencida** o **Cerrada**), la **Fecha límite**, la cantidad de estudiantes y el botón **Ver progreso**.

Para asignar una actividad:

1. Seleccione **Nueva actividad**. Si no aparece ninguna lectura, la pantalla indica **Todavía no hay nada para asignar**: necesita una lectura publicada con al menos una pregunta.
2. En **Lectura** elija el texto. Solo aparecen lecturas publicadas con al menos una pregunta, con el formato título, categoría y cantidad de preguntas.
3. En **Correos de los estudiantes** pegue las direcciones separadas por coma, espacio o salto de línea (hasta 100). La pantalla indica cuántos correos detectó e ignora los repetidos.
4. Revise la **Fecha límite**. Por defecto es dentro de siete días a las 23:59, en su hora local; debe ser posterior al momento actual y no puede superar los 2 años. Pasada esa fecha la actividad queda vencida.
5. Seleccione **Asignar actividad**. Mientras se procesa dice **Asignando…**.
6. Se muestra **Actividad asignada**, con la lista **Asignada a:** (nombre y correo de cada estudiante).

Si algún correo no corresponde a un estudiante, aparece la lista **No encontramos una cuenta de estudiante para:**. Esto significa que el correo no está registrado, está mal escrito o pertenece a una cuenta de docente o de administrador. Pida a esa persona que se registre con ese correo (las cuentas nuevas son de estudiante) y asígnele la actividad otra vez. Si ningún correo es de un estudiante, el sistema responde **Ninguno de los correos corresponde a un estudiante registrado.**

Cada vez que usted asigna, el sistema crea una actividad nueva. No envíe el formulario dos veces con los mismos estudiantes: ellos recibirían dos actividades sobre la misma lectura, y la segunda no suma XP porque solo se gana XP una vez por lectura. Después de asignar, puede usar **Asignar otra actividad** o **Volver a mis actividades**.

Mensajes de validación del formulario: **Elegí la lectura que querés asignar.**, **No detectamos ningún correo. Pegá al menos uno.** y **Elegí la fecha límite.**

### 4.6 Progreso

La sección **Progreso** lista sus actividades. Seleccione **Ver progreso** en la que desea revisar.

La pantalla de detalle muestra:

- Un resumen: **Avance** (por ejemplo, 3 de 5 resolvieron), **Pendientes** y **Promedio de aciertos**. El promedio se calcula solo entre quienes ya resolvieron.
- Una tabla con las columnas **Estudiante** (nombre y correo), **Estado** (**Resolvió** o **Pendiente**), **Aciertos (%)**, **XP** y **Resuelta el**.
- El botón **Actualizar** para volver a consultar los datos.

Para descargar los resultados, seleccione **Descargar CSV**. Se descarga un archivo llamado `progreso-` seguido del título de la lectura y la fecha de descarga, con extensión `.csv`. Contiene una fila por estudiante y las columnas Nombre, Correo, Estado, Aciertos (%), XP y Resuelta el.

Cuide este archivo: incluye el nombre y el correo de sus estudiantes. La propia pantalla lo advierte con **El archivo incluye nombre y correo de tus estudiantes. Guardalo y compartilo con cuidado.** Guárdelo solo donde sea necesario y no lo comparta fuera del ámbito educativo.

Para abrirlo en Excel con configuración regional en español, haga doble clic en el archivo: usa punto y coma como separador y codificación UTF-8, por lo que las tildes y la ñ se ven correctamente. Si su programa muestra todo en una sola columna o con caracteres extraños, use la opción de importar datos desde un archivo de texto o CSV y elija la codificación UTF-8 y el punto y coma como separador. Los decimales se escriben con coma.

### 4.7 Flujo de trabajo recomendado

1. Cree la lectura en **Borrador** (sección 4.3).
2. Agregue las preguntas con su respuesta correcta y su explicación (sección 4.4).
3. Revise la lectura y las preguntas; pase la lectura a **Publicada**.
4. Asigne la actividad a sus estudiantes con una fecha límite razonable (sección 4.5).
5. Consulte el avance en **Progreso** y, si lo necesita, descargue el CSV (sección 4.6).
6. Si necesita cambiar las preguntas, pase primero la lectura a borrador y recuerde que mientras esté en borrador los estudiantes no podrán abrir las actividades que la usan.

## 5. Manual del administrador

### 5.1 Acceso e inicio

Inicie sesión con una cuenta de administrador. La aplicación abre el panel de administración, cuya barra superior tiene **Inicio**, **Categorías**, **Usuarios** y **Auditoría**, además del botón **Cerrar sesión**. La pantalla de inicio saluda con **¡Hola, nombre!** y ofrece accesos directos a las tres secciones.

### 5.2 Categorías

Las categorías organizan las lecturas. La pantalla **Categorías** tiene el formulario **Nueva categoría** y la lista **Categorías existentes**.

Para crear una categoría:

1. Escriba el **Nombre** (entre 2 y 60 caracteres).
2. Si lo desea, escriba la **Descripción (opcional)** (hasta 200 caracteres).
3. Seleccione **Crear categoría**. Aparece **Creamos la categoría «nombre».**

El identificador de la categoría se genera automáticamente a partir del nombre (en minúsculas, sin tildes y con guiones) y se muestra en cada tarjeta como **Identificador**. No se puede elegir ni cambiar. Si ya existe uno igual, el sistema responde **Ya existe una categoría con el identificador «id». Probá con otro nombre.** Un nombre que no contenga ninguna letra del alfabeto latino ni números no es válido.

Para editar, seleccione **Editar** en la tarjeta, cambie el nombre o la descripción y use **Guardar cambios** (o **Cancelar**). El identificador no cambia.

Para eliminar:

1. Seleccione **Eliminar** en la tarjeta.
2. Lea la pregunta **¿Eliminar la categoría «nombre»? No se puede deshacer y solo es posible si ninguna lectura la usa.**
3. Seleccione **Confirmar: eliminar** o **Cancelar**.

No se puede eliminar una categoría que tenga lecturas, ni siquiera borradores: el sistema responde **Hay lecturas en esta categoría: movelas o eliminalas primero.** La razón es evitar lecturas que apunten a una categoría que ya no existe.

### 5.3 Usuarios

La pantalla **Usuarios** muestra una tabla con las columnas **Nombre**, **Correo**, **Rol** y **Cambiar rol**, y la cantidad de usuarios.

Herramientas de la pantalla:

- **Buscar por nombre**: ignora mayúsculas y tildes.
- **Filtrar por rol**: **Todos**, **Estudiante**, **Docente** o **Administrador**.
- **Mostrar correos completos**: por defecto los correos aparecen enmascarados (por ejemplo, la primera letra, asteriscos y el dominio) para no exponer datos personales por accidente, por ejemplo al proyectar la pantalla. Active este interruptor solo cuando necesite ver la dirección completa.

Para cambiar el rol de una persona:

1. Ubique la fila de la persona.
2. En la columna **Cambiar rol**, elija el rol nuevo en la lista.
3. Seleccione **Cambiar rol**.
4. Aparece la pregunta **¿Cambiar el rol de nombre de estudiante a docente?** (con los roles que correspondan). Seleccione **Confirmar** o **Cancelar**.
5. Aparece un aviso como **Cambiamos el rol de nombre: estudiante → docente.** El cambio queda registrado en la auditoría.

La persona cuyo rol cambió debe cerrar sesión y volver a iniciarla para que el panel y los permisos nuevos se apliquen.

No puede cambiar su propio rol: en su fila aparece **No podés cambiar tu propio rol** y la marca **(vos)**. Esto evita que un administrador se quede sin acceso y garantiza que siempre exista al menos un administrador.

### 5.4 Auditoría

La pantalla **Auditoría** muestra los últimos 50 cambios sensibles hechos en la plataforma, del más nuevo al más viejo. El botón **Actualizar** vuelve a consultar el registro.

| Columna | Qué muestra |
| --- | --- |
| Fecha | Día y hora en que ocurrió la acción. |
| Actor | Nombre de la persona que realizó la acción. Si no se puede resolver el nombre, se muestra una versión abreviada de su identificador. |
| Acción | Tipo de acción registrada. |
| Detalle | Resumen de lo que cambió. |

Las acciones que se registran son: **Cambio de rol** (detalle con el nombre de la persona y el cambio de rol), **Categoría creada**, **Categoría editada** (indica el nombre anterior y si cambió la descripción), **Categoría eliminada** y **Actividad asignada** (detalle con la cantidad de estudiantes). Resolver actividades, leer o editar lecturas y preguntas no se registran aquí. Si todavía no hay cambios aparece **Todavía no hay cambios registrados.**

## 6. Preguntas frecuentes y solución de problemas

| Problema | Causa probable | Qué hacer |
| --- | --- | --- |
| No puedo iniciar sesión y aparece **Correo o contraseña incorrectos.** | Correo o contraseña mal escritos. | Revise los datos o use **¿Olvidaste tu contraseña?** para restablecerla. |
| Aparece **Ya existe una cuenta con ese correo.** al registrarme | Esa dirección ya tiene cuenta. | Inicie sesión o recupere la contraseña. |
| Escribí la dirección del área docente o administrador y volví a mi propio panel | Esas áreas están restringidas a su rol. | Es el comportamiento esperado; use el menú de su rol. |
| Me hicieron docente o administrador pero sigo viendo el panel de estudiante | El rol se lee al iniciar sesión. | Cierre sesión y vuelva a ingresar. |
| No veo ninguna actividad | Ningún docente le ha asignado una. | Pida a su docente que la asigne con el correo con el que usted se registró. |
| La actividad aparece como **Vencida** o el envío falla con **La fecha límite de esta actividad ya ha pasado.** | Pasó la fecha límite. | Pida al docente que le asigne la actividad de nuevo con una fecha nueva. |
| Veo **Ya habías ganado XP con esta lectura, por eso esta vez no suma.** | Solo se gana XP una vez por lectura. | No es un error; su resultado y su racha sí quedaron registrados. |
| El botón **Enviar respuestas** está deshabilitado | Falta responder alguna pregunta. | Responda todas las preguntas. |
| Aparece **Faltan respuestas o la actividad cambió mientras la resolvías. Recarga la actividad para ver las preguntas actuales.** | El docente modificó las preguntas mientras usted resolvía. | Seleccione **Recargar actividad** y responda de nuevo. |
| Aparece **No pudimos enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo; tus respuestas siguen en esta pantalla.** | Falla de conexión. | Revise la conexión y vuelva a seleccionar **Enviar respuestas**. |
| Aparece **Actividad cerrada** o **Actividad sin preguntas** | La actividad ya no admite envíos o su lectura no tiene preguntas. | Consulte a su docente. |
| Aparece **Lectura no disponible** | La lectura se archivó, pasó a borrador o no existe. | Consulte a su docente o elija otra lectura de la biblioteca. |
| Estoy en el teléfono y no encuentro **Cerrar sesión** | La barra inferior no incluye esa opción. | Use una ventana o un dispositivo más ancho para cerrar la sesión. |
| El ícono de campana no hace nada | Las notificaciones aún no están disponibles. | No requiere ninguna acción. |
| No aparezco en el ranking | Solo entra quien resolvió al menos una actividad. | Resuelva una actividad. |
| Docente: no puedo agregar ni eliminar preguntas | La lectura está publicada. | Pásela a borrador desde **Lecturas**, haga el cambio y publíquela de nuevo. |
| Docente: mi lectura no aparece al asignar | No está publicada o no tiene preguntas. | Publique la lectura y agregue al menos una pregunta. |
| Docente: aparece **No encontramos una cuenta de estudiante para:** | El correo no está registrado, está mal escrito o es de otro rol. | Verifique el correo; la persona debe registrarse y luego se le asigna. |
| Docente: el CSV se ve en una sola columna o con símbolos raros | El programa no detectó el separador o la codificación. | Importe el archivo eligiendo UTF-8 y punto y coma como separador. |
| Administrador: no puedo eliminar una categoría | Tiene lecturas asociadas. | Mueva o elimine esas lecturas primero. |
| Administrador: no puedo cambiar mi rol | Está bloqueado por seguridad. | Pida a otro administrador que lo haga. |
| En estadísticas aparece **La consulta necesita el índice de Firestore configurado para el historial de intentos.** | Falta desplegar un índice de la base de datos. | Avise al equipo técnico para que despliegue los índices del proyecto. |

## 7. Glosario

| Término | Significado |
| --- | --- |
| XP | Puntos de experiencia que se ganan al acertar preguntas de una actividad. |
| Nivel | Etapa del estudiante según su XP total. |
| Racha | Cantidad de días de calendario seguidos con al menos una actividad resuelta. |
| Logro | Reconocimiento que se desbloquea al cumplir una meta, como completar una actividad. |
| Ranking | Lista de estudiantes ordenada por XP. |
| Alias | Nombre neutro, como Lector 5R6Z, con el que cada estudiante aparece en el ranking. |
| Actividad | Asignación de una lectura a estudiantes, con una fecha límite. |
| Lectura | Texto que se lee y sobre el cual se responden preguntas. |
| Categoría | Grupo temático que organiza las lecturas. |
| Borrador | Estado de una lectura en preparación, no visible para estudiantes. |
| Publicada | Estado de una lectura visible en la biblioteca y disponible para asignar. |
| Archivada | Estado de una lectura retirada de la biblioteca, que puede volver a publicarse. |
| Auditoría | Registro de los cambios sensibles hechos en la plataforma, visible solo para administradores. |
