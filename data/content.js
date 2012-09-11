document.documentElement.addEventListener("intent-addon", function(event) {
    console.log("GOT INTENT-ADDON MESSAGE IN CONTENT SCRIPT: "+JSON.stringify(event.detail));
    self.port.emit("intent-addon", event.detail);
});
