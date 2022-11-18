function deferMain(modules, deferredChunks, entryModuleId) {
  const modulesStr = modules
    .map((module) => {
      return `"${module.moduleId}":(module,exports,__webpack_require__)=>{
          ${module._source}
        }`;
    })
    .join(",");
  const deferredChunksStr =
    deferredChunks.length > 0 ? ',"' + deferredChunks.join('","') + '"' : "";
  return `(function (modules) {
          function webpackJsonpCallback(data) {
            var chunkIds = data[0];
            var moreModules = data[1];
            var executeModules = data[2];
            var moduleId,
              chunkId,
              i = 0,
              resolves = [];
            for (; i < chunkIds.length; i++) {
              chunkId = chunkIds[i];
              if (
                Object.prototype.hasOwnProperty.call(installedChunks, chunkId) &&
                installedChunks[chunkId]
              ) {
                resolves.push(installedChunks[chunkId][0]);
              }
              installedChunks[chunkId] = 0;
            }
            for (moduleId in moreModules) {
              if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
                modules[moduleId] = moreModules[moduleId];
              }
            }
            if (parentJsonpFunction) parentJsonpFunction(data);
            while (resolves.length) {
              resolves.shift()();
            }
            deferredModules.push.apply(deferredModules, executeModules || []);
            return checkDeferredModules();
          }
          function checkDeferredModules() {
            var result;
            for (var i = 0; i < deferredModules.length; i++) {
              var deferredModule = deferredModules[i];
              var fulfilled = true;
              for (var j = 1; j < deferredModule.length; j++) {
                var depId = deferredModule[j];
                if (installedChunks[depId] !== 0) fulfilled = false;
              }
              if (fulfilled) {
                deferredModules.splice(i--, 1);
                result = __webpack_require__(
                  (__webpack_require__.s = deferredModule[0])
                );
              }
            }
            return result;
          }
          var installedModules = {};
          var installedChunks = {
            page1: 0,
          };
          var deferredModules = [];
          function __webpack_require__(moduleId) {
            if (installedModules[moduleId]) {
              return installedModules[moduleId].exports;
            }
            var module = (installedModules[moduleId] = {
              i: module,
              l: false,
              exports: {},
            });
            const obj = new Proxy(
              {},
              {
                set(target, key, value) {
                  if (key === "exports") {
                    module.exports.default = value;
                  }
                  return true;
                },
              }
            );
            obj.exports = null;
            modules[moduleId].call(
              module.exports,
              obj,
              module.exports,
              __webpack_require__
            );
            module.l = true;
            return module.exports;
          }
          __webpack_require__.m = modules;
          __webpack_require__.c = installedModules;
          __webpack_require__.d = function (exports, name, getter) {
            if (!__webpack_require__.o(exports, name)) {
              Object.defineProperty(exports, name, { enumerable: true, get: getter });
            }
          };
          __webpack_require__.r = function (exports) {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
              Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
            }
            Object.defineProperty(exports, "__esModule", { value: true });
          };
          __webpack_require__.t = function (value, mode) {
            if (mode & 1) value = __webpack_require__(value);
            if (mode & 8) return value;
            if (mode & 4 && typeof value === "object" && value && value.__esModule)
              return value;
            var ns = Object.create(null);
            __webpack_require__.r(ns);
            Object.defineProperty(ns, "default", { enumerable: true, value });
            if (mode & 2 && typeof value != "string") {
              for (var key in value) {
                __webpack_require__.d(ns, key, () => {});
              }
            }
            return ns;
          };
          __webpack_require__.n = function (module) {
            var getter =
              module && module.__esModule
                ? function getDefault() {
                    return module["default"];
                  }
                : function getModuleExports() {
                    return module;
                  };
            __webpack_require__.d(getter, "a", getter);
            return getter;
          };
          __webpack_require__.o = function (object, property) {
            return Object.prototype.hasOwnProperty.call(object, property);
          };
          // __webpack_require__.p = "";
          __webpack_require__.p = "./";
          __webpack_require__.u = function (chunkId) {
             return chunkId + ".js";
          };
          __webpack_require__.l = function (url) {
          const script = document.createElement("script");
          script.src = url;
          document.head.append(script);
        };
  
         __webpack_require__.f = {
         l: function (chunkId, promises) {
         const promise = new Promise(function (resolve, reject) {
         installedChunks[chunkId] = [resolve, reject];
        });
          promises.push(promise);
        const url = __webpack_require__.p + __webpack_require__.u(chunkId);
        __webpack_require__.l(url);
      },
      };
        __webpack_require__.e = function (chunkId) {
        const promises = [];
        __webpack_require__.f.l(chunkId, promises);
        return Promise.all(promises);
      };
          var jsonpArray = (window["webpackJsonp"] = window["webpackJsonp"] || []);
          var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
          jsonpArray.push = webpackJsonpCallback;
          jsonpArray = jsonpArray.slice();
          for (var i = 0; i < jsonpArray.length; i++)
            webpackJsonpCallback(jsonpArray[i]);
          var parentJsonpFunction = oldJsonpFunction;
          deferredModules.push(["${entryModuleId}"${deferredChunksStr}]);
          return checkDeferredModules();
        })({
          ${modulesStr}
          },
        );
        `;
}
module.exports = deferMain;
