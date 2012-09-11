console.log("Android Intent Bridge loading");
const data = require("self").data;
const pageMod = require("page-mod");
const unload = require("unload");

const {JNI,android_log} = require("./jni");

exports.main = function(options, callbacks) {
    var jenv = JNI.GetForThread();
    var Intent = "Landroid/content/Intent;";
    var String = "Ljava/lang/String;";
    // declare fields & methods in java classes that we're going to use.
    JNI.LoadClass(jenv, "java.lang.Object", {
        methods: [
            { name: "toString", sig: "()"+String }
        ],
    });
    JNI.LoadClass(jenv, String, {
        methods: [
            { name: "equals", sig: "(Ljava/lang/Object;)Z" }
        ]
    });
    JNI.LoadClass(jenv, "["+String);
    JNI.LoadClass(jenv, Intent, {
        constructors: [
            { sig: "()V" },
            { sig: "(Ljava/lang/String;)V" },
            { sig: "(Ljava/lang/String;Landroid/net/Uri;)V" }
        ],
        static_fields: [
            { name: "EXTRA_TEXT", sig: String },
            { name: "EXTRA_STREAM", sig: String },
            { name: "EXTRA_EMAIL", sig: String },
        ],
        methods: [
            { name: "setType",
              sig: "(Ljava/lang/String;)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;Ljava/lang/CharSequence;)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;Landroid/os/Parcelable;)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;Ljava/lang/String;)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;[Ljava/lang/String;)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;J)"+Intent },
            { name: "putExtra",
              sig: "(Ljava/lang/String;D)"+Intent }
        ]
    });
    JNI.LoadClass(jenv, "android.text.Html", {
        static_methods: [
            { name: "fromHtml",
              sig: "(Ljava/lang/String;)Landroid/text/Spanned;" }
        ]
    });
    JNI.LoadClass(jenv, "android.net.Uri", {
        static_methods: [
            { name: "parse", sig: "(Ljava/lang/String;)Landroid/net/Uri;" }
        ]
    });
    JNI.LoadClass(jenv, "android.content.Context", {
        methods: [
            { name: "startActivity",
              sig: "(Landroid/content/Intent;)V" },
            { name: "sendBroadcast",
              sig: "(Landroid/content/Intent;)V" },
            { name: "sendStickyBroadcast",
              sig: "(Landroid/content/Intent;)V" },
        ],
    });
    // hacky way to get activity context
    JNI.LoadClass(jenv, "org.mozilla.gecko.GeckoApp", {
        static_fields: [
            { name: "mAppContext", sig: "Lorg/mozilla/gecko/GeckoApp;" }
        ],
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

var makeIntent = function(action, uri, type, extras) {
    var jenv = JNI.GetForThread();
    var Intent = JNI.classes.android.content.Intent;
    var Uri = JNI.classes.android.net.Uri;
    var StringArray = JNI.classes.java.lang.String.array;
    var isig = "Landroid/content/Intent;";

    var i = uri ? Intent.new(action, Uri.parse(uri)) : Intent.new(action);
    if (type) i.setType(type);
    // xxx provide means to type-annotate value?
    Object.getOwnPropertyNames(extras).forEach(function(key) {
        var value = extras[key];
        // since the number of extras is potentially unbounded, allocate
        // a new local frame here to ensure we don't overrun our parent's
        // local frame.
        jenv.contents.contents.PushLocalFrame(jenv, 16);
        try {
            if (Intent.EXTRA_TEXT.equals(key) && type==="text/html") {
                // if type is text/html, the extra text must be sent as HTML
                i["putExtra(Ljava/lang/String;Ljava/lang/CharSequence;)"+isig].call(i, key, Html.fromHtml(value));
            } else if (Intent.EXTRA_STREAM.equals(key)) {
	        //allows sharing of images as attachments.
	        //value in this case should be a URI of a file
                i["putExtra(Ljava/lang/String;Landroid/os/Parcelable;)"+isig].call(i, key, Uri.parse(value));
            } else if (Intent.EXTRA_EMAIL.equals(key)) {
                //allows to add the email address of the receiver
                if (typeof(value)==='string') { value = [value]; }
                var sa = StringArray.new(value.length);
                sa.setElements(0, value);
                i["putExtra(Ljava/lang/String;[Ljava/lang/String;)"+isig].call(i, key, sa);
            } else if (key==="TIMESTAMP") {
                i["putExtra(Ljava/lang/String;J)"+isig].call(i, key, value);
            } else if (typeof(value)==='number') {
                i["putExtra(Ljava/lang/String;D)"+isig].call(i, key, value);
            } else {
                i["putExtra(Ljava/lang/String;[Ljava/lang/String;)"+isig].call(i, key, value);
            }
        } finally {
            jenv.contents.contents.PopLocalFrame(jenv, null);
        }
    });
    return i;
};

var fireIntent = exports.fireIntent = function(details) {
    // a little bit of memory management: ensure that the local refs
    // created by the JNI wrappers get cleaned up.
    var jenv = JNI.GetForThread();
    jenv.contents.contents.PushLocalFrame(jenv, 16);
    try {
        fireIntentInner(details);
    } finally {
        jenv.contents.contents.PopLocalFrame(jenv, null);
    }
};
var fireIntentInner = function(details) {
    details = details || {};
    var intent = makeIntent(details.action||null,
                            details.uri||null,
                            details.type||null,
                            details.extras||Object.create(null));
    // XXX hacky way to get Context
    var context = JNI.classes.org.mozilla.gecko.GeckoApp.mAppContext;

    // several different ways Intents can be dispatched in Android.
    switch (details.method) {
    case "startActivity":
        context.startActivity(intent); break;
    case "sendStickyBroadcast":
        context.sendStickyBroadcast(intent); break;
    case "sendBroadcast":
    default:
        context.sendBroadcast(intent); break;
    }
    console.log("INTENT FIRED: "+JSON.stringify(details));
    console.log("INTENT toString: "+JNI.ReadString(JNI.GetForThread(),
                                                   intent.toString()));
};

exports.onUnload = function(reason) {
    console.log("Android Intent Bridge unloading");
    JNI.UnloadClasses(JNI.GetForThread());
};

