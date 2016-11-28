const path = require('path')
const Tray = require('electron').Tray

const tray = new Tray(path.join(__dirname, '../icons/sync-complete20.png'))

module.exports = {
  tray: tray,

  setSyncing: () => {
    tray.setImage(path.join(__dirname, '../icons/syncing20.png'))
  },

  setSynced: () => {
    tray.setImage(path.join(__dirname, '../icons/sync-complete20.png'))
  }
}
