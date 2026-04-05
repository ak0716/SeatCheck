/** Makes `import "server-only"` a no-op when running scripts under plain Node. */
const Module = require("module");
const orig = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return orig.apply(this, arguments);
};
