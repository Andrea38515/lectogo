const { initializeApp } = require("firebase-admin/app");

initializeApp();

exports.onUserCreate = require("./src/onUserCreate").onUserCreate;
exports.registrarIntento = require("./src/registrarIntento").registrarIntento;
