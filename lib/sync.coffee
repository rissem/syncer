Promise = require 'lie'
utils = require './utils'
gitIndexFile = "index-git-n-sync"
path = require 'path'

getHead = (srcDir)->
  utils.readFile(path.join(srcDir, ".git", "HEAD")).then (contents)->
    # example contents: ref: /refs/heads/master, ref would be /refs/heads/master
    ref = /ref: (.*)\n?/.exec(contents)[1]
    utils.readFile(path.join(srcDir, ".git", ref)).then (file)->
      sha = file.split("\n")[0]
      #is there a better way to combine the data from these two promises?
      return new Promise (resolve, reject)->
        resolve {ref, sha}

getSyncerHead = (srcDir)->
  utils.cmd(srcDir, "git show-ref --hash syncer/head").then ({stdout, stderr})->
    return new Promise (resolve, reject)->
      resolve(stdout.split("\n")[0])
  , ({stdout, stderr})-> #if ref doesn't exist just return a promise that resolves to null
    console.log stdout if stdout
    console.error stderr if stderr
    return new Promise (resolve, reject)->
      resolve null


createCommitFromWorkingDirectory = (srcDir)->

#main entry point
sync = (srcDir, remote)->
  # console.log "syncing #{srcDir} to #{remote}"
  getHead(srcDir).then ({ref, sha})->
    getSyncerHead(srcDir).then (syncerHead)->
      # create a fake commit w/ last known user commit and working branch encoded in message
      message = "git-n-sync commit, you probably shouldn't be seeing this\n\n#{ref} #{sha}"
      utils.cmd(srcDir, "git add -A .", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ->
        utils.cmd(srcDir, "git write-tree", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ({stdout, stderr})->
          treeHash = stdout.split("\n")[0]
          #parent commit is last syncer/head or HEAD of current branch is syncer/head is null
          command = "git commit-tree #{treeHash} -p #{syncerHead or sha} -m \"#{message}\"\n"
          utils.cmd(srcDir, command).then ({stdout, stderr})->
            commitHash = stdout.split("\n")[0]
            utils.cmd(srcDir, "git update-ref refs/syncer/head #{commitHash}").then ->
              command = "git push #{remote} #{commitHash}:refs/heads/__git-n-sync__"
              console.log "running command #{command}"
              utils.cmd srcDir, command
          , ({stdout, stderr})->
            console.log("STDOUT #{stdout}")
            console.log("STDERR #{stderr}")
module.exports = sync
