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

/*can-kefir@0.2.2#can-kefir*/
define('can-kefir', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-symbol',
    'can-util/js/dev/dev',
    'kefir',
    'can-observation',
    'can-cid',
    'can-event/batch/batch',
    'can-define-lazy-value'
], function (require, exports, module) {
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var dev = require('can-util/js/dev/dev');
    var Kefir = require('kefir');
    var Observation = require('can-observation');
    var CID = require('can-cid');
    var canBatch = require('can-event/batch/batch');
    var defineLazyValue = require('can-define-lazy-value');
    var observeDataSymbol = canSymbol.for('can.observeData');
    function getObserveData(stream) {
        var observeData = stream[observeDataSymbol];
        if (!observeData) {
            observeData = Object.create(null);
            observeData.onValueHandlers = [];
            observeData.onErrorHandlers = [];
            Object.defineProperty(stream, observeDataSymbol, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: observeData
            });
        }
        return observeData;
    }
    var keyNames = {
        'value': {
            on: 'onValue',
            handlers: 'onValueHandlers',
            off: 'offValue',
            handler: 'onValueHandler'
        },
        'error': {
            on: 'onError',
            handlers: 'onErrorHandlers',
            off: 'offError',
            handler: 'onErrorHandler'
        }
    };
    function getCurrentValue(stream, key) {
        if (stream._currentEvent && stream._currentEvent.type === key) {
            return stream._currentEvent.value;
        } else {
            var names = keyNames[key];
            if (!names) {
                return stream[key];
            }
            var VALUE, valueHandler = function (value) {
                    VALUE = value;
                };
            stream[names.on](valueHandler);
            stream[names.off](valueHandler);
            return VALUE;
        }
    }
    if (Kefir) {
        defineLazyValue(Kefir.Observable.prototype, '_cid', function () {
            return CID({});
        });
        canReflect.assignSymbols(Kefir.Observable.prototype, {
            'can.onKeyValue': function (key, handler) {
                var names = keyNames[key];
                var observeData = getObserveData(this);
                var handlers = observeData[names.handlers];
                if (handlers.length === 0) {
                    var stream = this;
                    var onHandler = observeData[names.handler] = function (value) {
                        if (value !== observeData[key]) {
                            observeData[key] = value;
                            handlers.forEach(function (handler) {
                                canBatch.queue([
                                    handler,
                                    stream,
                                    [value]
                                ]);
                            });
                        }
                    };
                    handlers.push(handler);
                    this[names.on](onHandler);
                } else {
                    handlers.push(handler);
                }
            },
            'can.offKeyValue': function (key, handler) {
                var names = keyNames[key];
                var observeData = getObserveData(this);
                var handlers = observeData[names.handlers];
                var index = handlers.indexOf(handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                    if (handlers.length === 0) {
                        this[names.off](observeData[names.handler]);
                        delete this[observeDataSymbol];
                    }
                }
            },
            'can.getKeyValue': function (key) {
                if (!keyNames[key]) {
                    return this[key];
                }
                Observation.add(this, key);
                if (!this[observeDataSymbol]) {
                    var observeData = getObserveData(this);
                    var currentValue = getCurrentValue(this, key);
                    return observeData[key] = currentValue;
                }
                return getObserveData(this)[key];
            }
        });
        Kefir.emitterProperty = function () {
            var emitter;
            var setLastValue = false;
            var lastValue, lastError;
            var stream = Kefir.stream(function (EMITTER) {
                emitter = EMITTER;
                if (setLastValue) {
                    emitter.value(lastValue);
                }
                return function () {
                    emitter = undefined;
                };
            });
            var property = stream.toProperty(function () {
                return lastValue;
            });
            property.emitter = {
                value: function (newValue) {
                    if (emitter) {
                        return emitter.emit(newValue);
                    } else {
                        setLastValue = true;
                        lastValue = newValue;
                    }
                },
                error: function (error) {
                    if (emitter) {
                        return emitter.error(error);
                    } else {
                        lastError = error;
                    }
                }
            };
            property.emitter.emit = property.emitter.value;
            canReflect.assignSymbols(property, {
                'can.setKeyValue': function (key, value) {
                    this.emitter[key](value);
                }
            });
            return property;
        };
    }
    module.exports = Kefir;
});
/*[global-shim-end]*/
(function(global) { // jshint ignore:line
	global._define = global.define;
	global.define = global.define.orig;
}
)(typeof self == "object" && self.Object == Object ? self : window);