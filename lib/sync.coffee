Promise = require 'lie'
utils = require './utils'
GIT_INDEX_FILE = ".git/index-git-n-sync"
path = require 'path'
_ = require 'underscore'
tray = require("./tray")

SYNCER_REF = "__git-n-sync__/head"

remoteToComponents = (remote)->
  [arg1, arg2] = remote.split(":")
  username = arg1.split("@")[0]
  host = arg1.split("@")[1]
  dir = arg2.split(".git")[0]
  return {username, host, dir}

class Syncer
  constructor: ({@srcDir, @remote, @verbose})->
    @newSyncNeeded = false
    # TODO
    # turn srcDir into an absolute path
    # add tests to make sure the user's index is kept clean

  #TODO figure out a less clunky way to do this
  # at some point creating the server repo should create docker
  # container + http proxy in front of it
  configureServer: ->
    {username, host, dir} = remoteToComponents(@remote)
    destination = "#{dir}/.git/hooks/post-receive"
    Promise.all [
      #allow pushing to the active branch
      utils.remoteCmd username, host, dir, "git config receive.denyCurrentBranch ignore",
      utils.writeRemoteFile(username, host, destination, "#{__dirname}/postReceive.js")
    ]

  #ref and branch pointed to by HEAD, ex: {ref: "refs/heads/master" sha: "4ebd20c3b676a7680e07ae382e8d280c6a0e67f6"}
  getHead: ->
    utils.readFile(path.join(@srcDir, ".git", "HEAD")).then (contents)=>
      # example contents: ref: /refs/heads/master, ref would be /refs/heads/master
      ref = /ref: (.*)\n?/.exec(contents)[1]
      utils.readFile(path.join(@srcDir, ".git", ref)).then (file)->
        sha = file.split("\n")[0]
        Promise.resolve {ref, sha}

  # create a fake commit w/ last known user commit and working branch encoded in message
  commitWorkingDir: (parentCommit, message)->
    #GIT_INDEX_FILE env variable allows you to stage files w/o in a separate file,
    #this prevents corruption of the user's staging area
    utils.cmd(@srcDir, "git add -A .", {env: {GIT_INDEX_FILE}}).then =>
      utils.cmd(@srcDir, "git write-tree", {env: {GIT_INDEX_FILE}}).then ({stdout, stderr})=>
        treeHash = stdout.split("\n")[0]
        command = "git commit-tree #{treeHash} -p #{parentCommit} -m \"#{message}\"\n"
        utils.cmd(@srcDir, command).then ({stdout, stderr})->
          commitHash = stdout.split("\n")[0]
          Promise.resolve commitHash

  # if no sync is in progress, sync and return results
  # if sync is in progress, make sure a new sync happens after

  sync: ->
    if @syncInProgress
      return Promise.resolve(null) if @nextSync
      subsequentSync = new Promise (resolve, reject)=>
        @nextSync = =>
          # console.log("subsequent sync beginning")
          return new Promise(@sync())
      #return a promise that resolves after next sync has happened
    else
      @syncInProgress = true
      tray.setSyncing()
      #if a sync is in progress then just queue this up
      syncStart = Date.now()
      @getHead(@srcDir).then ({ref, sha})=>
        message = "git-n-sync commit, you probably shouldn't be seeing this\n\n#{ref} #{sha}"

        #all commits
        @commitWorkingDir(sha, message).then (commitHash)=>
          utils.cmd(@srcDir, "git update-ref refs/#{SYNCER_REF} #{commitHash}").then =>
            command = "git push --force #{@remote} refs/#{SYNCER_REF}:refs/#{SYNCER_REF}"
            utils.cmd(@srcDir, command).then ({stdout, stderr})=>
              if @verbose
                console.log stdout
                console.error stderr
              syncData = @processRemoteOutput(stderr)
              _.extend syncData, {duration: Date.now()-syncStart}
              @syncInProgress = false
              tray.setSynced()
              if @nextSync
                tmp = @nextSync
                @nextSync = null
                tmp()
              Promise.resolve(syncData)


  processRemoteOutput: (remoteOutput)->
    # try parsing remote output
    # if we can't parse it just spit it all out and return an error

    #Other info we need or would be nice
    #last sync time
    #did a branch switch occur
    #was this the first sync ever?

    #strip out the 'remote:' prefix
    # console.log "raw output", remoteOutput if @verbose

    output = _.reduce remoteOutput.split("\n"), (memo, line)->
      memo + (line.split("remote: ")[1] or "") + "\n"
    , ""

    #hack for multi line regex
    summaryDiffRegex = /<SUMMARY DIFF>([.\s\S]*)<\/SUMMARY DIFF>/
    unless summaryDiffRegex.test(output)
      console.log "!!!!!!!!!!!!!!!!!!"
      console.log "UNEXPECTED FAILURE"
      console.log "!!!!!!!!!!!!!!!!!!"
      console.log remoteOutput
      process.exit(1)
      return

    summaryDiff = summaryDiffRegex.exec(output)[1]

    updates = []
    for line in summaryDiff.split("\n")
      match = /\s([A-Z])\s*([\S]*)\s*/.exec(line)
      if match
        [ignore, action, filename] = match
        if action == "M"
          updates.push {action: "Updated", filename}
        if action == "A"
          updates.push {action: "Added", filename}
        if action == "D"
          updates.push {action: "Deleted", filename}
        if action == "R"
          updates.push {action: "Renamed", filename}
        if action == "C"
          updates.push {action: "Copied", filename}
    return {updates}


module.exports = Syncer
