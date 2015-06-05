Promise = require 'lie'
utils = require './utils'
gitIndexFile = "index-git-n-sync"
path = require 'path'
fs = require 'fs'

getHead = (srcDir)->
  utils.readFile(path.join(srcDir, ".git", "HEAD")).then (contents)->
    # example contents: ref: /refs/heads/master, ref would be /refs/heads/master
    ref = /ref: (.*)\n?/.exec(contents)[1]
    utils.readFile(path.join(srcDir, ".git", ref)).then (file)->
      sha = file.split("\n")[0]
      #is there a better way to combine the data from these two promises?
      return new Promise (resolve, reject)->
        resolve {ref, sha}

#main entry point
sync = (srcDir, remote)->
  # create a fake commit w/ last known user commit and working branch encoded in message
  # TODO probably want to add a readable message in case a user finds the commit somehow

  getHead(srcDir).then ({ref, sha})->
    message = "git-n-sync commit, you probably shouldn't be seeing this\n\n#{ref} #{sha}"
    utils.cmd(srcDir, "git add -A .", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ->
      utils.cmd(srcDir, "git write-tree", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ({stdout, stderr})->
        treeHash = stdout.split("\n")[0]
        #parent needs to be the last commit, not the sha of the head
        #store this commit hash in a custom ref, should look at this
        #first and only use the head if it's not defined
        command = "git commit-tree #{treeHash} -p #{sha} -m \"#{message}\""
        utils.cmd(srcDir, command).then ({stdout, stderr})->
          commitHash = stdout.split("\n")[0]
          command = "git push #{remote} #{commitHash}:refs/heads/__git-n-sync__"
          console.log "running command #{command}"
          utils.cmd srcDir, command

module.exports = sync
