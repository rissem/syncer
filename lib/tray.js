const path = require('path')
const Tray = require('electron').Tray

let tray = null

const syncsInProgress = new Map()

const displaySyncingIcon = () => {
  tray.setImage(path.join(__dirname, '../icons/syncing20.png'))
}

const displaySyncCompleteIcon = () => {
  tray.setImage(path.join(__dirname, '../icons/sync-complete20.png'))
}

module.exports = {
  init: () => {
    tray = new Tray(path.join(__dirname, '../icons/sync-complete20.png'))
  },

  tray: tray,

  setSyncing: (repo) => {
    syncsInProgress.set(repo, true)
    displaySyncingIcon()
  },

  setDoneSyncing: (repo) => {
    syncsInProgress.delete(repo)
    if (syncsInProgress.size === 0) {
      displaySyncCompleteIcon()
    }
  },

  setSynced: () => {
    tray.setImage(path.join(__dirname, '../icons/sync-complete20.png'))
  }
}
