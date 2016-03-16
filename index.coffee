program = require "commander"
chokidar = require 'chokidar'
_ = require "underscore"

repo = ''

program
  .version('0.1.0')
  .description("Sync this repo with a remote.")
  .option('-f --force', "force server to be identical to client")
  .option('-w --watch', "watch the project and sync on changes")
  .option('-v --verbose', "include debug output")
  .arguments('<remote_repo>')
  .action((remote_repo) -> repo = remote_repo)

program.on '--help', ->
  console.log '  Arguments:'
  console.log ''
  console.log '    <remote_repo>  (required) format: \`user@host:path-to-repo\`'
  console.log ''
  console.log '  Example:'
  console.log ''
  console.log '    $ syncer --watch --verbose root@10.0.0.1:/rootdir/myrepo'
  console.log ''

program.parse(process.argv)
program.help() if !repo

Syncer = require("./lib/sync")

options = {watch: program.watch?, force: program.force?, verbose: program.verbose?}

scanComplete = false

syncer = new Syncer(srcDir:process.cwd(), remote:repo, verbose: options.verbose)

display = (results)->
  results.then (result)->
    return unless result
    {updates, duration} = result
    console.log "#{update.action} #{update.filename}" for update in updates
    if updates.length == 0
      console.log "No changes were synced"
    console.log "Sync completed in #{duration/1000.0} seconds"

#really only need to do this once, not every time the syncer is started
syncer.configureServer().then  ->
  if options.watch
    ignore = new RegExp("#{process.cwd()}/.git/objects|#{process.cwd()}/.git/refs/__git-n-sync__/head|#{process.cwd()}/.git/index-git-n-sync")
    watcher = chokidar.watch(process.cwd(), {})
    # TODO get smarter about what to ignore
    # watcher = chokidar.watch(process.cwd(), {ignored: /[\/\\]\./})
    watcher.on 'all', (event, path)->
      unless ignore.exec(path)
        console.log("Chokidar event", event, path) if scanComplete and options.verbose
        if scanComplete
          display(syncer.sync())

    watcher.on 'ready', ->
      console.log(new Date(), "WATCHER IS READY") if options.verbose
      scanComplete = true
      display(syncer.sync())

  else
    display(syncer.sync())
