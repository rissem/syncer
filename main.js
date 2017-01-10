const electron = require('electron')
const app = electron.app
const chokidar = require('chokidar')

const Syncer = require('./lib/sync')
const path = require('path')
const config = require(path.join(process.env.HOME, '.syncer.js'))

app.on('ready', () => {
  config.repos.forEach((repo) => {
    let scanComplete = false
    const syncer = new Syncer({
      srcDir: repo.local,
      remote: repo.remote,
      verbose: config.options.verbose
    })
    if (config.options.verbose) {
      console.log('configuring server')
    }
    syncer.configureServer().then(() => {
      if (config.options.watch) {
        console.log('watching', repo.local)
        const ignored = [new RegExp(`${repo.local}/.git/refs/__git-n-sync__/head|${repo.local}/.git/index-git-n-sync`),
                        new RegExp(`${repo.local}/.git/objects`)
        ].concat(repo.ignore)
        const watcher = chokidar.watch(repo.local, {ignored})

        // TODO if a huge number of files/directories are detected
        // warn the user, there is probably something not being ignored that
        // should be

        watcher.on('all', (event, path) => {
          if (scanComplete) {
            if (process.env.DEBUG) {
              console.log('event', event, path)
            }
            display(syncer.sync())
          }
        })

        watcher.on('ready', () => {
          if (config.options.verbose) {
            console.log(new Date(), 'WATCHER IS READY')
          }
          scanComplete = true
          display(syncer.sync())
        })
      } else {
        display(syncer.sync())
      }
    })
  })
})

const display = (results) => {
  results.then((result) => {
    if (!result) {
      return
    }
    const {updates, duration} = result
    updates.forEach((update) => {
      console.log `${update.action} ${update.filename} for update in updates`
    })
    if (updates.length === 0) {
      console.log('No changes were synced')
      console.log(`Sync completed in ${duration / 1000} seconds`)
    }
  })
}
