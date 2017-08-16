var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var dev = require("can-util/js/dev/dev");
var Kefir = require("kefir");
var Observation = require("can-observation");
var CID = require("can-cid");
var canBatch = require("can-event/batch/batch");

var observeDataSymbol = canSymbol.for("can.observeData");

function getObserveData(stream) {
	var observeData = stream[observeDataSymbol];
	if(!observeData) {
		observeData = Object.create(null);
		observeData.onValueCount = observeData.onErrorCount = 0;
		observeData.onValueHandlers = [];
		observeData.onErrorHandlers = [];
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

// TODO: use can-define's
var replaceWith = function(obj, prop, cb, writable) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		get: function() {
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
		set: function(value){
			Object.defineProperty(this, prop, {
				value: value,
				writable: !!writable
			});
			return value;
		}
	});
};

// makes the CID property a virtual property whose value gets defined later.
replaceWith(Kefir.Observable.prototype,"_cid", function(){
	return CID({});
});


var keyNames = {
	"value": {on: "onValue", handlers: "onValueHandlers", off: "offValue", handler: "onValueHandler"},
	"error": {on: "onError", handlers: "onErrorHandlers", off: "offError", handler: "onErrorHandler"}
};

// Observable is parent of Kefir.Stream
canReflect.assignSymbols(Kefir.Observable.prototype, {
	"can.onKeyValue": function(key, handler){
		var names = keyNames[key];
		//!steal-remove-start
		if(!names) {
			dev.warn("can-kefir: You can not listen to the "+key+" property on a Kefir stream.");
		}
		//!steal-remove-end

		var observeData = getObserveData(this);
		var handlers = observeData[names.handlers];
		if( handlers.length === 0 ) {
			var stream = this;
			var onHandler = observeData[names.handler] = function(value){
				observeData[key] = value;
				handlers.forEach(function(handler){
					canBatch.queue([handler, stream, [value]]);
				});
			};
			this[names.on](onHandler);
		}
		handlers.push(handler);
	},
	"can.offKeyValue": function(key, handler){
		var names = keyNames[key];

		var observeData = getObserveData(this);
		var handlers = observeData[names.handlers];

		var index = handlers.indexOf(handler);
		if(index !== -1) {
			handlers.splice(index, 1);
			if(handlers.length === 0) {
				this[names.off](observeData[names.handler]);
			}
		}
	},
	"can.getKeyValue": function(key){
		//!steal-remove-start
		if(!keyNames[key]) {
			dev.warn("can-kefir: You can not listen to the "+key+" property on a Kefir stream.");
		}
		//!steal-remove-end
		Observation.add(this, key);
		return getObserveData(this)[key];
	}
});

module.exports = Kefir;
