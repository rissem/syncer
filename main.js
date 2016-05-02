require('coffee-script/register')
const electron = require('electron')

const app = electron.app


app.on("ready", function(){
  require("./index.coffee");
});
