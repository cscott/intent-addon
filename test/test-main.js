var main = require("main");
main.main({ loadReason: "startup" }, []);

exports.test_fireIntent_exists = function(assert) {
    assert.ok(typeof(main.fireIntent)==='function', "fireIntent() exists");
};

exports.test_fireIntent = function(assert) {
    var fireIntent = main.fireIntent;
    var name = "hello", value = "world!";
    var o = { name: name, value: value, millis: Date.now() };
    fireIntent({
        action: 'edu.mit.media.funf.RECORD',
        method: 'sendBroadcast',
        extras: {
            DATABASE_NAME: 'mainPipeline',
            TIMESTAMP: Math.floor(Date.now()/1000),
            NAME: "intent-addon-test",
            VALUE: JSON.stringify(o)
        }
    });
    assert.pass("no exceptions thrown");
};

require("test").run(exports);

// XXX how to ensure that onUnload runs only after all the tests?
//main.onUnload("shutdown");
