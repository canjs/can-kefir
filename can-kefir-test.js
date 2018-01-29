var Kefir = require("can-kefir");
var QUnit = require("steal-qunit");
var queues = require("can-queues");
var canReflect = require("can-reflect");

QUnit.module("can-kefir");

QUnit.test("basics", function() {
	var EMITTER;

	QUnit.expect(5);

	var stream = Kefir.stream(function(emitter) {
		EMITTER = emitter;
	});

	var valueEventCount = 0;
	function valueHandler(value) {
		valueEventCount++;
		if (valueEventCount === 1) {
			QUnit.equal(value, 1, "produced a value");
		} else if (valueEventCount === 2) {
			QUnit.equal(value, 2, "produced a value");
		} else {
			QUnit.ok(false, "should not be called");
		}
	}
	canReflect.onKeyValue(stream, "value", valueHandler);

	EMITTER.value(1);
	QUnit.equal(canReflect.getKeyValue(stream, "value"), 1, "got initial value");

	EMITTER.value(2);
	canReflect.offKeyValue(stream, "value", valueHandler);

	EMITTER.value(3);

	var errorEventCount = 0;
	function errorHandler(value) {
		errorEventCount++;
		if (errorEventCount === 1) {
			QUnit.equal(value, "a", "produced an error");
		} else {
			QUnit.ok(false, "no more errors");
		}
	}
	canReflect.onKeyValue(stream, "error", errorHandler);

	EMITTER.error("a");
	QUnit.equal(
		canReflect.getKeyValue(stream, "error"),
		"a",
		"got initial value"
	);

	canReflect.offKeyValue(stream, "error", errorHandler);
	EMITTER.error("b");
});

QUnit.test("properties can be read without binding", function() {
	var EMITTER;

	var property = Kefir.stream(function(emitter) {
		EMITTER = emitter;
	}).toProperty();

	property.onValue(function() {});
	EMITTER.value(10);

	QUnit.equal(
		canReflect.getKeyValue(property, "value"),
		10,
		"got property value"
	);
});

QUnit.test("properties caches value/error correctly when unbound", function(assert) {
	var emitter;

	var stream = Kefir.stream(function(e) {
		emitter = e;
	}).toProperty();

	var handler = function noop() {};
	canReflect.onKeyValue(stream, "value", handler);
	emitter.value(10);
	canReflect.offKeyValue(stream, "value", handler);

	assert.equal(canReflect.getKeyValue(stream, "value"), 10);
	assert.equal(canReflect.getKeyValue(stream, "error"), undefined);

	canReflect.onKeyValue(stream, "value", handler);
	assert.equal(canReflect.getKeyValue(stream, "value"), 10, "should be cached");
	canReflect.offKeyValue(stream, "value", handler);
});

QUnit.test("callbacks are within a batch", function(assert) {
	var emitter;
	assert.expect(2);

	var stream = Kefir.stream(function(e) {
		emitter = e;
	});

	var valueChangeCounter = 0;
	canReflect.onKeyValue(stream, "value", function onValueChange() {
		valueChangeCounter += 1;
	});

	queues.batch.start();
	emitter.value(1);
	assert.equal(
		valueChangeCounter,
		0,
		"handler should not be called while flushing is prevented"
	);
	queues.batch.stop();

	assert.equal(valueChangeCounter, 1);
});

QUnit.test("Kefir.emitterProperty", function() {
	var stream = new Kefir.emitterProperty();

	var valueEventCount = 0;
	function valueHandler(value) {
		valueEventCount++;
		if (valueEventCount === 1) {
			QUnit.equal(value, 1, "produced a value");
		} else if (valueEventCount === 2) {
			QUnit.equal(value, 2, "produced a value");
		} else {
			QUnit.ok(false, "should not be called");
		}
	}
	canReflect.onKeyValue(stream, "value", valueHandler);
	stream.emitter.emit(1);

	QUnit.equal(canReflect.getKeyValue(stream, "value"), 1, "got initial value");

	canReflect.setKeyValue(stream, "value", 2);
	canReflect.offKeyValue(stream, "value", valueHandler);
	stream.emitter.value(3);

	var errorEventCount = 0;
	function errorHandler(value) {
		errorEventCount++;
		if (errorEventCount === 1) {
			QUnit.equal(value, "a", "produced an error");
		} else {
			QUnit.ok(false, "no more errors");
		}
	}
	canReflect.onKeyValue(stream, "error", errorHandler);

	stream.emitter.error("a");
	QUnit.equal(
		canReflect.getKeyValue(stream, "error"),
		"a",
		"got initial value"
	);

	canReflect.offKeyValue(stream, "error", errorHandler);
	stream.emitter.error("b");
});

QUnit.test("get behavior with constant stream", function() {
	var stream = Kefir.stream(function(emit) {
		emit.value(1);
	});

	canReflect.onKeyValue(stream, "value", function(newVal) {
		QUnit.equal(newVal, 1, "got new Value");
	});

	QUnit.equal(canReflect.getKeyValue(stream, "value"), 1, "undefined");
});

QUnit.test("read emitter", function() {
	var stream = new Kefir.emitterProperty();
	QUnit.equal(
		canReflect.getKeyValue(stream, "emitter"),
		stream.emitter,
		"got the emitter"
	);
});

QUnit.test("getValueDependencies with a single source", function(assert) {
	var source = Kefir.sequentially(750, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
	var result = source.throttle(2500);

	assert.deepEqual(canReflect.getValueDependencies(result), {
		valueDependencies: new Set([source])
	});
});

QUnit.test("getValueDependencies with multiple sources", function(assert) {
	var a = Kefir.constant("a");
	var b = Kefir.constant("b");
	var c = Kefir.constant("c");

	var combined = Kefir.combine([a, b, c], function(x, y, z) {
		return x + y + z;
	});

	assert.deepEqual(canReflect.getValueDependencies(combined), {
		valueDependencies: new Set([a, b, c])
	});
});
