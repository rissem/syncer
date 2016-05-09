chokidar = require 'chokidar'
_ = require "underscore"

Syncer = require "./lib/sync"

path = require 'path'
config = require(path.join(process.env.HOME, '.syncer.js'))

scanComplete = false

syncers = config.repos.map (repo)->
  syncer = new Syncer({
    srcDir:repo.local,
    remote:repo.remote,
    verbose: config.options.verbose})

    #really only need to do this once, not every time the syncer is started
  console.log("configuring server") if config.options.verbose
  syncer.configureServer().then  ->
    console.log("server configured") if config.options.verbose
    if config.options.watch
      console.log("watching!", repo.local)
      ignore = new RegExp("#{repo.local}/.git/objects|#{repo.local}/.git/refs/__git-n-sync__/head|#{repo.local}/.git/index-git-n-sync")
      watcher = chokidar.watch(repo.local, {})
      # TODO get smarter about what to ignore
      # watcher = chokidar.watch(repo.local, {ignored: /[\/\\]\./})
      watcher.on 'all', (event, path)->
        unless ignore.exec(path)
          console.log("Chokidar event", event, path) if scanComplete and config.options.verbose
          if scanComplete
            display(syncer.sync())

      watcher.on 'ready', ->
        console.log(new Date(), "WATCHER IS READY") if config.options.verbose
        scanComplete = true
        display(syncer.sync())

    else
      display(syncer.sync())
  , (err)->
      console.error(err)


display = (results)->
  results.then (result)->
    return unless result
    {updates, duration} = result
    console.log "#{update.action} #{update.filename}" for update in updates
    if updates.length == 0
      console.log "No changes were synced"
    console.log "Sync completed in #{duration/1000.0} seconds"

