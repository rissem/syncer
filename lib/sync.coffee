Promise = require 'lie'
run = require './run'

#main entry point
sync = (srcDir, remote)->
  # create a fake commit w/ last known "real commit" and working branch encoded in message (empty if necessary)
  # commit is created by adding everything to to an alternate staging area, and crafting a commit there
  # (do we pay a penalty (and how big) if all the trees are bigger than they should be?) don't think so
  # push commit to server (special git-n-sync branch)
  # rest of the magic is in post-receive hook
  #   set HEAD to working branch
  #   set working branch to last real commit
  #   restore from last virtual commit

  push(srcDir, remote)

push = (srcDir, remote)->
  run.cmd "git push #{remote} master", srcDir

module.exports = sync
