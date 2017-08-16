var canReflect = require("can-reflect");
var canSymbol = require("can-symbol");
var dev = require("can-util/js/dev/dev");
var Kefir = require("kefir");
var Observation = require("can-observation");
var CID = require("can-cid");

var observeDataSymbol = canSymbol.for("can.observeData");

function getObserveData(stream) {
	var observeData = stream[observeDataSymbol];
	if(!observeData) {
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


var onPropertyMatches = {
	"value": "onValue",
	"error": "onError"
};
var offPropertyMatches = {
	"value": "offValue",
	"error": "offError"
};

// Observable is parent of Kefir.Stream
canReflect.assignSymbols(Kefir.Observable.prototype, {
	"can.onKeyValue": function(key, handler){
		var listenName = onPropertyMatches[key];
		//!steal-remove-start
		if(!listenName) {
			dev.warn("can-kefir: You can not listen to the "+key+" property on a Kefir stream.");
		}
		//!steal-remove-end
		var handlerName = listenName+"Handler";
		var countName = listenName+"Count";

		var observeData = getObserveData(this);
		if( observeData[countName] === 0 ) {
			observeData[handlerName] = function(value){
				observeData[key] = value;
			};
			this[listenName](observeData[handlerName]);
		}
		observeData[countName]++;
		this[listenName](handler);
	},
	"can.offKeyValue": function(key, handler){
		var listenName = offPropertyMatches[key];
		var handlerName = listenName+"Handler";
		var countName = listenName+"Count";

		var observeData = getObserveData(this);
		if( observeData[countName] === 1 ) {
			this[listenName](observeData[handlerName]);
		}
		observeData[countName]--;
		this[listenName](handler);
	},
	"can.getKeyValue": function(key){
		//!steal-remove-start
		if(!offPropertyMatches[key]) {
			dev.warn("can-kefir: You can not listen to the "+key+" property on a Kefir stream.");
		}
		//!steal-remove-end
		Observation.add(this, key);
		return getObserveData(this)[key];
	}
});

module.exports = Kefir;
