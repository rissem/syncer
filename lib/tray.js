const path = require("path");
const Tray = require("electron").Tray;

tray = new Tray(path.join(__dirname, "../icons/sync-complete20.png"));

module.exports = {
  tray: tray,

  setSyncing: function() {
    tray.setImage(path.join(__dirname, "../icons/syncing20.png"));
  },

  setSynced: function() {
    tray.setImage(path.join(__dirname, "../icons/sync-complete20.png"));
  }
};
