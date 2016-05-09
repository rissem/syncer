require('coffee-script/register');
const electron = require('electron');

const app = electron.app;

let tray = null;

app.on("ready", function() {
  require("./index.coffee");
  tray = require("./lib/tray").tray;
});
