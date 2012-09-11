var data = require("self").data;
var pageMod = require("page-mod");

var fireIntent = function(details) {
    // XXX implement me for mobile
    console.log("INTENT FIRED: "+JSON.stringify(details));
};

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
