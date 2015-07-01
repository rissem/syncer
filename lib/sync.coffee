Promise = require 'lie'
utils = require './utils'
gitIndexFile = "index-git-n-sync"
path = require 'path'

#TODO convert this to object with srcDir so we're not always passing it around

#ref and branch pointed to by HEAD
getHead = (srcDir)->
  utils.readFile(path.join(srcDir, ".git", "HEAD")).then (contents)->
    # example contents: ref: /refs/heads/master, ref would be /refs/heads/master
    ref = /ref: (.*)\n?/.exec(contents)[1]
    utils.readFile(path.join(srcDir, ".git", ref)).then (file)->
      sha = file.split("\n")[0]
      #is there a better way to combine the data from these two promises?
      Promise.resolve {ref, sha}

#last syncer commit hash
getSyncerHead = (srcDir)->
  utils.cmd(srcDir, "git show-ref --hash syncer/head").then ({stdout, stderr})->
    return Promise.resolve (stdout.split("\n")[0])
  , ({stdout, stderr})-> #if ref doesn't exist just return a promise that resolves to null
    console.log stdout if stdout
    console.error stderr if stderr
    Promise.resolve null


commitWorkingDir = (parentCommit, message, srcDir)->
  # create a fake commit w/ last known user commit and working branch encoded in message
  utils.cmd(srcDir, "git add -A .", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ->
    utils.cmd(srcDir, "git write-tree", {env: {GIT_INDEX_FILE: gitIndexFile}}).then ({stdout, stderr})->
      treeHash = stdout.split("\n")[0]
      command = "git commit-tree #{treeHash} -p #{parentCommit} -m \"#{message}\"\n"
      utils.cmd(srcDir, command).then ({stdout, stderr})->
        commitHash = stdout.split("\n")[0]
        Promise.resolve commitHash

# Two kinds of syncs
# a) new branch (first time syncing to branch or just switched branches)
# push a commit w/o a parent, let server know which branch we are on
# branch has already been synced at least once
# push commit w/ parent = the last commit
# in both cases update the ref to this commit and note the branch name as a symbolic ref

#main entry point
sync = (srcDir, remote)->
  getHead(srcDir).then ({ref, sha})->
    getSyncerHead(srcDir).then (syncerHead)->
      message = "git-n-sync commit, you probably shouldn't be seeing this\n\n#{ref} #{sha}"
      commitWorkingDir(syncerHead or sha, message, srcDir).then (commitHash)->
        utils.cmd(srcDir, "git update-ref refs/syncer/head #{commitHash}").then ->
          command = "git push #{remote} #{commitHash}:refs/heads/__git-n-sync__"
          console.log "running command #{command}"
          utils.cmd(srcDir, command).then ({stdout, stderr})->
            console.log stdout if stdout
            console.error stderr if stderr

module.exports = sync
