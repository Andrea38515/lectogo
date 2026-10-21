const { initializeApp } = require("firebase-admin/app");

initializeApp();

exports.onUserCreate = require("./src/onUserCreate").onUserCreate;
exports.registrarIntento = require("./src/registrarIntento").registrarIntento;
exports.asignarActividad = require("./src/asignarActividad").asignarActividad;
exports.cambiarRol = require("./src/cambiarRol").cambiarRol;
exports.gestionarCategoria =
  require("./src/gestionarCategoria").gestionarCategoria;
