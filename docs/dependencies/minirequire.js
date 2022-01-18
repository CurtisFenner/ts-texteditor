"use strict";
var define = (function () {
    function debug() {
        var everything = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            everything[_i] = arguments[_i];
        }
        //console.info("minirequire:", ...everything);
    }
    var loadedModules = {};
    var queue = [];
    var SPECIAL = {
        "$minirequire": function () {
            return {
                queue: queue,
                loadedModules: loadedModules
            };
        },
        "exports": function (_a) {
            var exported = _a.exported;
            return exported;
        },
        "require": function (_a) {
            var requestingModuleID = _a.requestingModuleID;
            return function (request) {
                throw new Error("minirequire: dynamic call `require("
                    + JSON.stringify(request)
                    + ")` from `"
                    + requestingModuleID
                    + "` is not implemented.");
            };
        }
    };
    function attemptItem(item) {
        debug("attempting", item.qualifiedModuleName);
        var exported = {};
        var resolved = [];
        for (var _i = 0, _a = item.qualifiedStaticDependencies; _i < _a.length; _i++) {
            var dependency = _a[_i];
            var special = SPECIAL[dependency];
            if (special !== undefined) {
                resolved.push(special({
                    exported: exported,
                    requestingModuleID: item.qualifiedModuleName
                }));
            }
            else {
                var module = loadedModules[dependency];
                if (module === undefined) {
                    debug(item.qualifiedModuleName, "requires", dependency, "which is not yet satisfied.");
                    return "unsatisfied";
                }
                resolved.push(module.exported);
            }
        }
        loadedModules[item.qualifiedModuleName] = {
            exported: exported,
            state: "loading"
        };
        debug("loading", item.qualifiedModuleName);
        var result = item.f.apply(item, resolved);
        if (result !== undefined) {
            throw new Error("unexpected return from `" + item.definingSrc + ":" + item.qualifiedModuleName + "`.");
        }
        loadedModules[item.qualifiedModuleName].state = "done";
        debug("successful", item.qualifiedModuleName);
        debug("loadedModules:", loadedModules);
        debug("queue:", queue);
        return "successful";
    }
    function drainQueue() {
        while (queue.length !== 0) {
            var progress = false;
            for (var i = 0; i < queue.length; i++) {
                var item = queue[i];
                var attempt = attemptItem(item);
                if (attempt === "successful") {
                    queue[i] = queue[queue.length - 1];
                    queue.pop();
                    progress = true;
                }
            }
            if (!progress) {
                return;
            }
        }
    }
    return function define() {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        var script = document.currentScript;
        var unqualifiedModuleName;
        var unqualifiedDependencies;
        var f;
        if (props.length === 3) {
            unqualifiedModuleName = props[0], unqualifiedDependencies = props[1], f = props[2];
        }
        else {
            unqualifiedModuleName = (script && script.src) || (Math.random() + "");
            unqualifiedDependencies = props[0];
            f = props[1];
        }
        // TODO: Module ID rewriting rules.
        var qualifiedModuleName = unqualifiedModuleName;
        var qualifiedDependencies = [];
        for (var _a = 0, unqualifiedDependencies_1 = unqualifiedDependencies; _a < unqualifiedDependencies_1.length; _a++) {
            var unqualifiedDependency = unqualifiedDependencies_1[_a];
            if (unqualifiedDependency in SPECIAL) {
                qualifiedDependencies.push(unqualifiedDependency);
            }
            else {
                // TODO: Dependency module ID rewriting rules.
                var qualified = unqualifiedDependency;
                qualifiedDependencies.push(qualified);
            }
        }
        queue.push({
            qualifiedModuleName: qualifiedModuleName,
            qualifiedStaticDependencies: qualifiedDependencies,
            definingSrc: script && script.src,
            f: f
        });
        debug("grew queue to", queue);
        drainQueue();
    };
})();
define.amd = true;
//# sourceMappingURL=minirequire.js.map