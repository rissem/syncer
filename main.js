require('coffee-script/register')
const electron = require('electron')

const app = electron.app

app.on('ready', () => {
  require('./index.coffee')
})
