const electron = require('electron')
const app = electron.app
const chokidar = require('chokidar')

const Syncer = require('./lib/sync')
const path = require('path')
const config = require(path.join(process.env.HOME, '.syncer.js'))
const tray = require('./lib/tray')
const tunnel = require('./lib/tunnel')

app.on('ready', () => {
  tray.init()
  config.repos.forEach((repo) => {
    tunnel.create(repo)
    let scanComplete = false
    const syncer = new Syncer({
      srcDir: repo.local,
      remote: repo.remote,
      verbose: config.options.verbose
    })
    if (config.options.verbose) {
      console.log('configuring server')
    }

    // TODO extract all this watcher stuff into its own file
    syncer.configureServer().then(() => {
      if (config.options.watch) {
        console.log('watching', repo.local)
        let ignored = [new RegExp(`${repo.local}/.git/refs/__git-n-sync__/head|${repo.local}/.git/index-git-n-sync`),
                        new RegExp(`${repo.local}/.git/objects`)
        ]
        if (repo.ignore) {
          ignored = ignored.concat(repo.ignore.map(pattern =>
            !pattern.startsWith('/') ? path.join(repo.local, pattern) : pattern
          ))
        }
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
    }).catch((e) => {
      console.trace('Error configuring server', e)
    })
  })
})

const display = (results) => {
  return results.then((result) => {
    if (!result) {
      return
    }
    const {updates, duration} = result
    if (updates.length === 0) {
      console.log('No changes were synced')
    } else {
      updates.map((update) => {
        console.log(`${update.action} ${update.filename}`)
      })
    }
    console.log(`Sync completed in ${duration / 1000} seconds`)
  }).catch((e) => {
    console.trace('error syncing', e)
  })
}
