// Contenido de ejemplo para LectoGo. Todos los textos son originales.
//
// Los IDs son fijos para que el seed sea idempotente: correrlo dos veces
// sobrescribe los mismos documentos en vez de duplicarlos.
//
// Cada pregunta lleva `respuestaCorrecta` y `explicacion` aparte del resto:
// el seed las escribe en preguntas/{id}/solucion/datos, que ningún
// estudiante puede leer según firestore.rules.

const VF = ["Verdadero", "Falso"];

const categorias = [
  { id: "fabulas", nombre: "Fábulas", descripcion: "Historias breves con una enseñanza." },
  { id: "cuentos", nombre: "Cuentos", descripcion: "Relatos de aventuras y de imaginación." },
  { id: "ciencia", nombre: "Ciencia", descripcion: "Textos para entender cómo funciona el mundo." },
  { id: "historia", nombre: "Historia", descripcion: "Hechos y personajes del pasado." },
];

const lecturas = [
  {
    id: "lectura-el-zorro-y-el-tambor",
    titulo: "El zorro y el tambor",
    categoriaId: "fabulas",
    nivelDificultad: "Fácil",
    contenido:
      "Un zorro muy hambriento caminaba por el bosque cuando escuchó un ruido fuerte: ¡bum, bum, bum! " +
      "Pensó que era un animal enorme y que tendría mucha carne, así que se acercó con cuidado. " +
      "Detrás de un árbol encontró un tambor viejo. Una rama movida por el viento lo golpeaba una y otra vez.\n\n" +
      "El zorro rompió el tambor con las patas, pero dentro solo había aire. " +
      "Se sintió muy tonto. «Hacía tanto ruido por fuera y estaba vacío por dentro», pensó. " +
      "Desde ese día, el zorro aprendió que quien más grita no siempre es quien más tiene.",
    preguntas: [
      {
        id: "p-zorro-1",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué causaba el ruido que escuchó el zorro?",
        opciones: ["Un animal enorme", "Una rama que golpeaba un tambor", "Un trueno", "Otro zorro"],
        respuestaCorrecta: "Una rama que golpeaba un tambor",
        explicacion: "El texto dice que una rama movida por el viento golpeaba el tambor.",
      },
      {
        id: "p-zorro-2",
        tipo: "verdadero_falso",
        enunciado: "Dentro del tambor había comida.",
        opciones: VF,
        respuestaCorrecta: "Falso",
        explicacion: "Dentro del tambor solo había aire.",
      },
      {
        id: "p-zorro-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué sintió el zorro al descubrir el tambor vacío?",
        opciones: ["Alegría", "Miedo", "Se sintió muy tonto", "Sueño"],
        respuestaCorrecta: "Se sintió muy tonto",
        explicacion: "El texto lo dice de forma directa: «Se sintió muy tonto».",
      },
      {
        id: "p-zorro-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Cuál es la enseñanza de la fábula?",
        opciones: [
          "Hay que comer antes de salir",
          "Quien más grita no siempre es quien más tiene",
          "Los tambores son peligrosos",
          "Hay que evitar el bosque",
        ],
        respuestaCorrecta: "Quien más grita no siempre es quien más tiene",
        explicacion: "Es la conclusión que el zorro saca al final de la historia.",
      },
    ],
  },
  {
    id: "lectura-la-hormiga-viajera",
    titulo: "La hormiga viajera",
    categoriaId: "cuentos",
    nivelDificultad: "Fácil",
    contenido:
      "Lía era una hormiga curiosa. Mientras sus hermanas cargaban semillas hacia el hormiguero, " +
      "ella miraba las nubes y se preguntaba qué habría más allá del jardín.\n\n" +
      "Una mañana se subió a una hoja que flotaba en un charco y la corriente la llevó hasta el otro lado del patio. " +
      "Allí conoció a un caracol que le habló de la lluvia, y a una mariposa que le habló del viento. " +
      "Al atardecer, Lía volvió al hormiguero con las patas cansadas y mil historias para contar. " +
      "Sus hermanas la escucharon toda la noche y, desde entonces, también empezaron a mirar el cielo.",
    preguntas: [
      {
        id: "p-hormiga-1",
        tipo: "seleccion_multiple",
        enunciado: "¿Cómo cruzó Lía el charco?",
        opciones: ["Nadando", "Sobre una hoja que flotaba", "Saltando", "Sobre un caracol"],
        respuestaCorrecta: "Sobre una hoja que flotaba",
        explicacion: "Se subió a una hoja y la corriente la llevó al otro lado.",
      },
      {
        id: "p-hormiga-2",
        tipo: "verdadero_falso",
        enunciado: "Lía conoció a un caracol y a una mariposa.",
        opciones: VF,
        respuestaCorrecta: "Verdadero",
        explicacion: "El caracol le habló de la lluvia y la mariposa del viento.",
      },
      {
        id: "p-hormiga-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué hacían las hermanas de Lía mientras ella miraba las nubes?",
        opciones: ["Dormían", "Cargaban semillas", "Jugaban", "Buscaban a Lía"],
        respuestaCorrecta: "Cargaban semillas",
        explicacion: "Cargaban semillas hacia el hormiguero.",
      },
      {
        id: "p-hormiga-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué cambió en el hormiguero después del viaje?",
        opciones: [
          "Se mudaron de jardín",
          "Las hermanas también empezaron a mirar el cielo",
          "Lía dejó de salir",
          "Ya no cargaron semillas",
        ],
        respuestaCorrecta: "Las hermanas también empezaron a mirar el cielo",
        explicacion: "El cuento termina con las hermanas imitando la curiosidad de Lía.",
      },
    ],
  },
  {
    id: "lectura-el-ciclo-del-agua",
    titulo: "El ciclo del agua",
    categoriaId: "ciencia",
    nivelDificultad: "Medio",
    contenido:
      "El agua de la Tierra no se acaba: se transforma y se mueve en un recorrido llamado ciclo del agua. " +
      "Todo comienza cuando el sol calienta los mares, los ríos y los lagos. " +
      "Una parte del agua se convierte en vapor y sube a la atmósfera; a ese proceso se le llama evaporación.\n\n" +
      "En las alturas hace frío, y el vapor se enfría y forma pequeñas gotas que se agrupan en las nubes. " +
      "Esta etapa se llama condensación. Cuando las gotas pesan demasiado, caen en forma de lluvia, granizo o nieve: es la precipitación.\n\n" +
      "Parte del agua que cae se infiltra en el suelo y alimenta los acuíferos; el resto corre hacia los ríos y vuelve al mar, " +
      "donde el ciclo empieza de nuevo.",
    preguntas: [
      {
        id: "p-agua-1",
        tipo: "seleccion_multiple",
        enunciado: "¿Cómo se llama el proceso en que el agua se convierte en vapor?",
        opciones: ["Condensación", "Evaporación", "Precipitación", "Infiltración"],
        respuestaCorrecta: "Evaporación",
        explicacion: "El texto lo define así: el agua se convierte en vapor y sube a la atmósfera.",
      },
      {
        id: "p-agua-2",
        tipo: "verdadero_falso",
        enunciado: "El agua de la Tierra se acaba cada vez que llueve.",
        opciones: VF,
        respuestaCorrecta: "Falso",
        explicacion: "El texto afirma que el agua no se acaba, sino que se transforma y se mueve.",
      },
      {
        id: "p-agua-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué ocurre en la condensación?",
        opciones: [
          "El agua cae como lluvia",
          "El vapor se enfría y forma gotas en las nubes",
          "El agua entra al suelo",
          "El sol calienta el mar",
        ],
        respuestaCorrecta: "El vapor se enfría y forma gotas en las nubes",
        explicacion: "Es la etapa en la que el vapor se enfría y se agrupa en nubes.",
      },
      {
        id: "p-agua-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué pasa con el agua que se infiltra en el suelo?",
        opciones: [
          "Desaparece",
          "Se convierte en nieve",
          "Alimenta los acuíferos",
          "Sube de nuevo a las nubes de inmediato",
        ],
        respuestaCorrecta: "Alimenta los acuíferos",
        explicacion: "El texto dice que parte del agua se infiltra y alimenta los acuíferos.",
      },
    ],
  },
  {
    id: "lectura-el-sistema-solar",
    titulo: "El sistema solar",
    categoriaId: "ciencia",
    nivelDificultad: "Medio",
    contenido:
      "El sistema solar está formado por el Sol y por todos los cuerpos que giran a su alrededor. " +
      "El Sol es una estrella y concentra casi toda la masa del sistema; su gravedad mantiene en órbita a los planetas.\n\n" +
      "Hay ocho planetas. Los cuatro más cercanos al Sol —Mercurio, Venus, la Tierra y Marte— son rocosos y relativamente pequeños. " +
      "Más lejos están Júpiter y Saturno, gigantes formados sobre todo por gases, y Urano y Neptuno, que son gigantes helados.\n\n" +
      "Entre Marte y Júpiter hay un cinturón de asteroides, rocas de distintos tamaños que también orbitan alrededor del Sol. " +
      "La Tierra es el único planeta conocido donde existe vida.",
    preguntas: [
      {
        id: "p-solar-1",
        tipo: "seleccion_multiple",
        enunciado: "¿Cuántos planetas tiene el sistema solar según el texto?",
        opciones: ["Cuatro", "Seis", "Ocho", "Diez"],
        respuestaCorrecta: "Ocho",
        explicacion: "El texto indica: «Hay ocho planetas».",
      },
      {
        id: "p-solar-2",
        tipo: "verdadero_falso",
        enunciado: "Júpiter y Saturno son planetas rocosos.",
        opciones: VF,
        respuestaCorrecta: "Falso",
        explicacion: "Son gigantes formados sobre todo por gases.",
      },
      {
        id: "p-solar-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Dónde está el cinturón de asteroides?",
        opciones: [
          "Entre la Tierra y Venus",
          "Entre Marte y Júpiter",
          "Después de Neptuno",
          "Alrededor de la Luna",
        ],
        respuestaCorrecta: "Entre Marte y Júpiter",
        explicacion: "El texto ubica el cinturón entre Marte y Júpiter.",
      },
      {
        id: "p-solar-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué mantiene a los planetas en órbita?",
        opciones: ["El viento solar", "La gravedad del Sol", "Los asteroides", "La Luna"],
        respuestaCorrecta: "La gravedad del Sol",
        explicacion: "Según el texto, la gravedad del Sol mantiene en órbita a los planetas.",
      },
    ],
  },
  {
    id: "lectura-el-origen-de-los-juegos-olimpicos",
    titulo: "El origen de los Juegos Olímpicos",
    categoriaId: "historia",
    nivelDificultad: "Difícil",
    contenido:
      "Los Juegos Olímpicos de la Antigüedad se celebraban en Olimpia, una ciudad de la Grecia clásica, en honor a Zeus. " +
      "Según los registros más aceptados, las primeras competencias oficiales tuvieron lugar en el año 776 antes de nuestra era, " +
      "y se repitieron cada cuatro años durante más de un milenio.\n\n" +
      "Durante los juegos se declaraba una tregua sagrada: las ciudades en guerra debían detener sus combates para que atletas y espectadores " +
      "viajaran con seguridad. Las pruebas incluían carreras, lucha, lanzamiento de disco y de jabalina, y carreras de carros.\n\n" +
      "En el año 393 de nuestra era, el emperador romano Teodosio prohibió estas celebraciones paganas. " +
      "Los juegos modernos no regresaron hasta 1896, en Atenas, impulsados por el barón Pierre de Coubertin, " +
      "que quiso recuperar el ideal de unir a los pueblos a través del deporte.",
    preguntas: [
      {
        id: "p-olimpicos-1",
        tipo: "seleccion_multiple",
        enunciado: "¿En qué ciudad se celebraban los Juegos Olímpicos de la Antigüedad?",
        opciones: ["Atenas", "Esparta", "Olimpia", "Roma"],
        respuestaCorrecta: "Olimpia",
        explicacion: "El primer párrafo los sitúa en Olimpia, en la Grecia clásica.",
      },
      {
        id: "p-olimpicos-2",
        tipo: "verdadero_falso",
        enunciado: "Durante los juegos, las ciudades en guerra debían suspender sus combates.",
        opciones: VF,
        respuestaCorrecta: "Verdadero",
        explicacion: "Era la tregua sagrada que describe el segundo párrafo.",
      },
      {
        id: "p-olimpicos-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Quién prohibió las celebraciones en el año 393?",
        opciones: [
          "Pierre de Coubertin",
          "El emperador Teodosio",
          "Los atenienses",
          "Zeus",
        ],
        respuestaCorrecta: "El emperador Teodosio",
        explicacion: "El texto atribuye la prohibición al emperador romano Teodosio.",
      },
      {
        id: "p-olimpicos-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué ideal quiso recuperar Pierre de Coubertin con los juegos modernos?",
        opciones: [
          "Honrar a Zeus",
          "Ganar guerras",
          "Unir a los pueblos a través del deporte",
          "Crear nuevas pruebas",
        ],
        respuestaCorrecta: "Unir a los pueblos a través del deporte",
        explicacion: "Es la idea con la que cierra el último párrafo.",
      },
    ],
  },
  {
    id: "lectura-el-faro-de-la-isla",
    titulo: "El faro de la isla",
    categoriaId: "cuentos",
    nivelDificultad: "Difícil",
    contenido:
      "Desde que su padre se retiró, Mateo cuidaba solo el faro de la isla. Cada noche subía los ciento doce escalones, " +
      "limpiaba el cristal de la lámpara y la encendía justo cuando el horizonte se teñía de gris. " +
      "Nadie sabía su nombre en el continente, pero cientos de barcos dependían de aquella luz.\n\n" +
      "Una noche de tormenta, la lámpara se apagó. Mateo recorrió el mecanismo a oscuras, con las manos temblando por el frío, " +
      "hasta descubrir que una tuerca se había aflojado. La ajustó, y el haz de luz volvió a cruzar el mar justo cuando " +
      "una sombra enorme asomaba entre las olas: era un pesquero que había perdido el rumbo.\n\n" +
      "A la mañana siguiente, el capitán dejó una nota en el muelle: «Gracias por la luz». " +
      "Mateo la leyó, sonrió y se dijo que algunos trabajos no necesitan aplausos para tener sentido.",
    preguntas: [
      {
        id: "p-faro-1",
        tipo: "seleccion_multiple",
        enunciado: "¿Por qué se apagó la lámpara durante la tormenta?",
        opciones: [
          "Se rompió el cristal",
          "Una tuerca se había aflojado",
          "Se acabó el combustible",
          "El viento la apagó",
        ],
        respuestaCorrecta: "Una tuerca se había aflojado",
        explicacion: "Mateo descubre que una tuerca del mecanismo estaba floja.",
      },
      {
        id: "p-faro-2",
        tipo: "verdadero_falso",
        enunciado: "Mateo cuidaba el faro junto a su padre durante la tormenta.",
        opciones: VF,
        respuestaCorrecta: "Falso",
        explicacion: "Su padre se había retirado y Mateo cuidaba el faro solo.",
      },
      {
        id: "p-faro-3",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué estaba a punto de ocurrirle al pesquero?",
        opciones: [
          "Pescar demasiado",
          "Perder el rumbo y chocar",
          "Quedarse sin combustible",
          "Llegar tarde al muelle",
        ],
        respuestaCorrecta: "Perder el rumbo y chocar",
        explicacion: "Era un barco que había perdido el rumbo y apareció entre las olas.",
      },
      {
        id: "p-faro-4",
        tipo: "seleccion_multiple",
        enunciado: "¿Qué idea expresa el final del cuento?",
        opciones: [
          "Los faros ya no son necesarios",
          "Hay trabajos que tienen sentido aunque nadie aplauda",
          "Conviene vivir en el continente",
          "Las tormentas son inevitables",
        ],
        respuestaCorrecta: "Hay trabajos que tienen sentido aunque nadie aplauda",
        explicacion: "Es la reflexión final de Mateo tras leer la nota del capitán.",
      },
    ],
  },
];

module.exports = { categorias, lecturas };
