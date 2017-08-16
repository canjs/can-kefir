var QUnit = require("steal-qunit");
var Kefir = require("can-kefir");
var canReflect = require("can-reflect");


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
