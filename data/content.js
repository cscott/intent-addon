document.documentElement.addEventListener("intent-addon", function(event) {
    self.port.emit("intent-addon", event.detail);
});
