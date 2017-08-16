/*[global-shim-start]*/
(function(exports, global, doEval) {
	// jshint ignore:line
	var origDefine = global.define;

	var get = function(name) {
		var parts = name.split("."),
			cur = global,
			i;
		for (i = 0; i < parts.length; i++) {
			if (!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val) {
		var parts = name.split("."),
			cur = global,
			i,
			part,
			next;
		for (i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if (!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod) {
		if (!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, default: true };
		for (var p in mod) {
			if (!esProps[p]) return false;
		}
		return true;
	};

	var hasCjsDependencies = function(deps) {
		return (
			deps[0] === "require" && deps[1] === "exports" && deps[2] === "module"
		);
	};

	var modules =
		(global.define && global.define.modules) ||
		(global._define && global._define.modules) ||
		{};
	var ourDefine = (global.define = function(moduleName, deps, callback) {
		var module;
		if (typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for (i = 0; i < deps.length; i++) {
			args.push(
				exports[deps[i]]
					? get(exports[deps[i]])
					: modules[deps[i]] || get(deps[i])
			);
		}
		// CJS has no dependencies but 3 callback arguments
		if (hasCjsDependencies(deps) || (!deps.length && callback.length)) {
			module = { exports: {} };
			args[0] = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args[1] = module.exports;
			args[2] = module;
		} else if (!args[0] && deps[0] === "exports") {
			// Babel uses the exports and module object.
			module = { exports: {} };
			args[0] = module.exports;
			if (deps[1] === "module") {
				args[1] = module;
			}
		} else if (!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if (globalExport && !get(globalExport)) {
			if (useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	});
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function() {
		// shim for @@global-helpers
		var noop = function() {};
		return {
			get: function() {
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load) {
				doEval(__load.source, global);
			}
		};
	});
})(
	{},
	typeof self == "object" && self.Object == Object ? self : window,
	function(__$source__, __$global__) {
		// jshint ignore:line
		eval("(function() { " + __$source__ + " \n }).call(__$global__);");
	}
);

/*can-kefir@0.0.0#can-kefir*/
define('can-kefir', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-symbol',
    'can-util/js/dev/dev',
    'kefir',
    'can-observation',
    'can-cid'
], function (require, exports, module) {
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var dev = require('can-util/js/dev/dev');
    var Kefir = require('kefir');
    var Observation = require('can-observation');
    var CID = require('can-cid');
    var observeDataSymbol = canSymbol.for('can.observeData');
    function getObserveData(stream) {
        var observeData = stream[observeDataSymbol];
        if (!observeData) {
            observeData = Object.create(null);
            observeData.onValueCount = observeData.onErrorCount = 0;
            CID(observeData);
            Object.defineProperty(stream, observeDataSymbol, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: observeData
            });
        }
        return observeData;
    }
    var replaceWith = function (obj, prop, cb, writable) {
        Object.defineProperty(obj, prop, {
            configurable: true,
            get: function () {
                Object.defineProperty(this, prop, {
                    value: undefined,
                    writable: true,
                    configurable: true
                });
                var value = cb.call(this, obj, prop);
                Object.defineProperty(this, prop, {
                    value: value,
                    writable: !!writable
                });
                return value;
            },
            set: function (value) {
                Object.defineProperty(this, prop, {
                    value: value,
                    writable: !!writable
                });
                return value;
            }
        });
    };
    replaceWith(Kefir.Observable.prototype, '_cid', function () {
        return CID({});
    });
    var onPropertyMatches = {
        'value': 'onValue',
        'error': 'onError'
    };
    var offPropertyMatches = {
        'value': 'offValue',
        'error': 'offError'
    };
    canReflect.assignSymbols(Kefir.Observable.prototype, {
        'can.onKeyValue': function (key, handler) {
            var listenName = onPropertyMatches[key];
            var handlerName = listenName + 'Handler';
            var countName = listenName + 'Count';
            var observeData = getObserveData(this);
            if (observeData[countName] === 0) {
                observeData[handlerName] = function (value) {
                    observeData[key] = value;
                };
                this[listenName](observeData[handlerName]);
            }
            observeData[countName]++;
            this[listenName](handler);
        },
        'can.offKeyValue': function (key, handler) {
            var listenName = offPropertyMatches[key];
            var handlerName = listenName + 'Handler';
            var countName = listenName + 'Count';
            var observeData = getObserveData(this);
            if (observeData[countName] === 1) {
                this[listenName](observeData[handlerName]);
            }
            observeData[countName]--;
            this[listenName](handler);
        },
        'can.getKeyValue': function (key) {
            Observation.add(this, key);
            return getObserveData(this)[key];
        }
    });
    module.exports = Kefir;
});
/*[global-shim-end]*/
(function(global) { // jshint ignore:line
	global._define = global.define;
	global.define = global.define.orig;
}
)(typeof self == "object" && self.Object == Object ? self : window);