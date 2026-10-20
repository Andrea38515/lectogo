// Se carga con `node --require` para comprobar que el simulacro del backfill
// no necesita firebase-admin ni gamificacion.js: cualquier require de ellos
// lanza un error.
const Module = require("node:module");

const original = Module._load;

Module._load = function (request, ...rest) {
  if (/firebase-admin|gamificacion/.test(request)) {
    throw new Error(`carga ansiosa no permitida: ${request}`);
  }
  return original.call(this, request, ...rest);
};
