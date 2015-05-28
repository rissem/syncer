Promise = require 'lie'
run = require './run'
gitIndexFile = "index-git-n-sync"
path = require 'path'
fs = require 'fs'

#TODO move this out into common libary
readFile = (filename)->
  new Promise (resolve, reject)->
    fs.readFile filename, 'utf-8',  (err,data)->
      if err
        reject err
      else
        resolve data

getHead = (srcDir)->
  readFile(path.join(srcDir, ".git", "HEAD")).then (contents)->
    # example contents: ref: /refs/heads/master, ref would be /refs/heads/master
    ref = /ref: (.*)\n?/.exec(contents)[1]
    readFile(path.join(srcDir, ".git", ref)).then (file)->
      sha = file.split("\n")[0]
      #is there a better way to combine the data from these two promises?
      return new Promise (resolve, reject)->
        resolve {ref, sha}

#main entry point
sync = (srcDir, remote)->
  # TODO order of args for run.cmd seems backwards here..
  # create a fake commit w/ last known user commit and working branch encoded in message
  # TODO probably want to add a readable message in case a user finds the commit somehow

  getHead(srcDir).then ({ref, sha})->
    message = "#{ref} #{sha}"
    run.cmd("git add -A .", srcDir, {env: {GIT_INDEX_FILE: gitIndexFile}}).then ->
      run.cmd("git write-tree", srcDir, {env: {GIT_INDEX_FILE: gitIndexFile}}).then ({stdout, stderr})->
        treeHash = stdout.split("\n")[0]
        command = "git commit-tree #{treeHash} -p #{sha} -m \"#{message}\""
        run.cmd(command, srcDir).then ({stdout, stderr})->
          commitHash = stdout.split("\n")[0]
          command = "git push #{remote} #{commitHash}:refs/heads/__git-n-sync__"
          console.log "running command #{command}"
          run.cmd command, srcDir

module.exports = sync
