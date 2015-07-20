# Syncer

Keep a local git repository in sync with a remote as you develop. Every file change triggers a sync. This is useful if you want to develop with a native editor while using a development box in the cloud. TODO: write blog post about why this is a good idea.

## Installation
1. `git clone https://github.com/rissem/syncer syncer`
2. Put it on your path. Something like `[sudo] ln -s /PATH/TO/syncer/bin/syncer  /usr/local/bin/syncer`

## Usage
Within your repo run `$ syncer REMOTE_REPO`

For example: `$ syncer git@mygitserver.com:/home/git/d3`

Remote repo currently must be a SSH clone URL. The syncer uses the SSH connection to add a post-receive hook to the remote repo.

The remote repo can be bare, but the initial sync will be signiciantly faster if it already has commits in it. See
`syncer --help` for full options.

## How it works
TODO



