console.log("Android Intent Bridge loading");
const data = require("self").data;
const pageMod = require("page-mod");
const unload = require("unload");

const {JNI,android_log} = require("./jni");

exports.main = function(options, callbacks) {
    var jenv = JNI.GetForThread();
    // declare fields & methods in java classes that we're going to use.
    JNI.LoadClass(jenv, "java.lang.Object", {
        methods: [
            { name: "toString", sig: "()Ljava/lang/String;" }
        ],
    });
    JNI.LoadClass(jenv, "[I");
    JNI.LoadClass(jenv, "[Ljava/lang/String;");
    JNI.LoadClass(jenv, "java.util.Arrays", {
        static_methods: [
            { name: "sort", sig: "([Ljava/lang/Object;)V" },
            { name: "sort", sig: "([I)V" },
            { name: "toString", sig: "([Ljava/lang/Object;)Ljava/lang/String;"},
            { name: "toString", sig: "([I)Ljava/lang/String;" },
        ]
    });

    pageMod.PageMod({
        include: ["*"],
        contentScriptFile: data.url("content.js"),
        onAttach: function(worker) {
            // bridge from content script to add-on code
            worker.port.on("intent-addon", function(details) {
                fireIntent(details);
            });
        }
    });
};

var fireIntent = function(details) {
    // XXX implement me for mobile
    console.log("INTENT FIRED: "+JSON.stringify(details));

    // demonstrate correct functioning of JNI module (Java bridge)
    var jenv = JNI.GetForThread();
    var IntArray = JNI.classes.int.array;
    var Arrays = JNI.classes.java.util.Arrays;
    var ia = IntArray.new(5);
    ia.setElements(0, [5,3,4,2,1]);
    var before = JNI.ReadString(jenv, Arrays.toString(ia));
    Arrays.sort(ia);
    var after  = JNI.ReadString(jenv, Arrays.toString(ia));
    ia = ia.getElements(0, ia.length);
    console.log(3, "CSA: "+before + " -> " + after+" ("+ia+")");
};

exports.onUnload = function(reason) {
    console.log("Android Intent Bridge unloading");
    JNI.UnloadClasses(JNI.GetForThread());
};

