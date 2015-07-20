program = require "commander"
chokidar = require 'chokidar'
_ = require "underscore"

program
  .version('0.1.0')
  .description("sync this repo w/ a remote")
  .option('-f --force', "force server to be identical to client")
  .option('-w --watch', "watch the project and sync on changes")
  .parse(process.argv)

sync = require("./lib/sync")

options = {watch: program.watch?, force: program.force?}
repo = process.argv[process.argv.length - 1]

if options.watch
  chokidar.watch(process.cwd(), {}).on 'all', (event, path)->
    #ignore objects created by syncer
    ignore = new RegExp("#{process.cwd()}/.git/objects|#{process.cwd()}/.git/refs/__git-n-sync__/head|#{process.cwd()}/.git/index-git-n-sync")
    unless ignore.exec(path)
      # console.log(event, path)
      syncAfterTheStorm()
else
  sync(process.cwd(), repo, options)

syncAfterTheStorm = _.debounce ->
  console.log "now sync"
  sync(process.cwd(), repo, options)
  # should record how long these take
, 300
