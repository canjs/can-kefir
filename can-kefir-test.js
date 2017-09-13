var QUnit = require("steal-qunit");
var Kefir = require("can-kefir");
var canReflect = require("can-reflect");
var batch = require("can-event/batch/batch");

QUnit.module("can-kefir", {

});

QUnit.test("basics", 5, function() {
	var EMITTER;
	var stream = Kefir.stream(function(emitter){
		EMITTER = emitter;
	});


	var valueEventCount = 0;
	function valueHandler(value){
		valueEventCount++;
		if(valueEventCount === 1) {
			QUnit.equal(value, 1, "produced a value");
		} else if (valueEventCount === 2) {
			QUnit.equal(value, 2, "produced a value");
		} else {
			QUnit.ok(false, "should not be called");
		}
	}
	canReflect.onKeyValue(stream,"value", valueHandler);

	EMITTER.value(1);

	QUnit.equal( canReflect.getKeyValue(stream,"value"), 1, "got initial value");

	EMITTER.value(2);
	canReflect.offKeyValue(stream,"value", valueHandler);
	EMITTER.value(3);


	var errorEventCount = 0;
	function errorHandler(value){
		errorEventCount++;
		if(errorEventCount === 1) {
			QUnit.equal(value, "a", "produced an error");
		} else {
			QUnit.ok(false, "no more errors");
		}
	}
	canReflect.onKeyValue(stream,"error", errorHandler);

	EMITTER.error("a");

	QUnit.equal( canReflect.getKeyValue(stream,"error"), "a", "got initial value");

	canReflect.offKeyValue(stream,"error", errorHandler);
	EMITTER.error("b");

});

QUnit.test("streams have a cid", function(){

	var stream = Kefir.stream(function(){});
	QUnit.ok(stream._cid, "streams have a cid");
});

QUnit.test("callbacks are within a batch", function(){
	var EMITTER;
	var stream = Kefir.stream(function(emitter){
		EMITTER = emitter;
	});

	function valueHandler(){
		QUnit.ok(batch.batchNum, "batchNum exists");
	}
	canReflect.onKeyValue(stream,"value", valueHandler);

	EMITTER.value(1);
});

QUnit.test("properties can be read without binding", function(){
	var EMITTER;
	var property = Kefir.stream(function(emitter){
		EMITTER = emitter;
	}).toProperty();

	property.onValue(function(){});
	EMITTER.value(10);

	QUnit.equal( canReflect.getKeyValue(property,"value"), 10, "got property value" );

});

QUnit.test("Kefir.emitterProperty", function(){
	var stream = new Kefir.emitterProperty();


	var valueEventCount = 0;
	function valueHandler(value){
		valueEventCount++;
		if(valueEventCount === 1) {
			QUnit.equal(value, 1, "produced a value");
		} else if (valueEventCount === 2) {
			QUnit.equal(value, 2, "produced a value");
		} else {
			QUnit.ok(false, "should not be called");
		}
	}
	canReflect.onKeyValue(stream,"value", valueHandler);

	stream.emitter.emit(1);

	QUnit.equal( canReflect.getKeyValue(stream,"value"), 1, "got initial value");

	canReflect.setKeyValue( stream, "value", 2);
	canReflect.offKeyValue(stream,"value", valueHandler);
	stream.emitter.value(3);


	var errorEventCount = 0;
	function errorHandler(value){
		errorEventCount++;
		if(errorEventCount === 1) {
			QUnit.equal(value, "a", "produced an error");
		} else {
			QUnit.ok(false, "no more errors");
		}
	}
	canReflect.onKeyValue(stream,"error", errorHandler);

	stream.emitter.error("a");

	QUnit.equal( canReflect.getKeyValue(stream,"error"), "a", "got initial value");

	canReflect.offKeyValue(stream,"error", errorHandler);
	stream.emitter.error("b");
});

QUnit.test("get behavior with constant stream", function(){
	var stream = Kefir.stream(function(emit){
		emit.value(1);
	});

	canReflect.onKeyValue(stream, "value", function(newVal){
		QUnit.equal(newVal, 1, "got new Value");
	});

	QUnit.equal( canReflect.getKeyValue(stream,"value"), 1, "undefined");
});

QUnit.test("read emitter", function(){
	var stream = new Kefir.emitterProperty();
	QUnit.equal( canReflect.getKeyValue(stream,"emitter"), stream.emitter, "got the emitter");
});
