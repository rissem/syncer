program = require "commander"
chokidar = require 'chokidar'
_ = require "underscore"

program
  .version('0.1.0')
  .description("sync this repo w/ a remote")
  .option('-f --force', "force server to be identical to client")
  .option('-w --watch', "watch the project and sync on changes")
  .option('-v --verbose', "include debug output")
  .parse(process.argv)

sync = require("./lib/sync")

options = {watch: program.watch?, force: program.force?, verbose: program.verbose?}
repo = process.argv[process.argv.length - 1]

scanComplete = false

if options.watch
  watcher = chokidar.watch(process.cwd(), {})
  watcher.on 'all', (event, path)->
    #ignore objects created by syncer
    ignore = new RegExp("#{process.cwd()}/.git/objects|#{process.cwd()}/.git/refs/__git-n-sync__/head|#{process.cwd()}/.git/index-git-n-sync")
    unless ignore.exec(path)
      console.log("Chokidar event", event, path) if scanComplete and options.verbose
j      syncAfterTheStorm()

  watcher.on 'ready', ->
    scanComplete = true

else
  sync(process.cwd(), repo, options)

syncAfterTheStorm = _.debounce ->
  console.log "Syncing.."
  sync(process.cwd(), repo, options).then ({duration, updates})->
    console.log "#{update.action} #{update.filename}" for update in updates
    if updates.length == 0
      console.log "No changes were synced"
    console.log "Sync completed in #{duration/1000.0} seconds"

, 300
