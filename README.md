# Syncer

Keep a local git repository in sync with a remote as you develop. Every file change triggers a sync. This is useful if you want to develop with a native editor while using a development box in the cloud. TODO: write blog post about why this is a good idea.

## Installation
1. `git clone https://github.com/rissem/syncer syncer`
2. Put it on your path. Something like `[sudo] ln -s /PATH/TO/syncer/bin/syncer  /usr/local/bin/syncer`

## Usage
1. Clone your repo onto your remote server with `git clone` and note the location.
2. Ensure node is installed and available as `node` on the remote machine
2. On your local machine, in your repo run `$ syncer --watch --verbose REMOTE_REPO`

For example: `$ syncer --watch --verbose user@mygitserver.com:/home/git/d3`

Remote repo currently must be a SSH clone URL. The syncer uses the SSH connection to add a post-receive hook to the remote repo.

The remote also must have NodeJS installed and on the path as `/usr/local/bin/node`. I've tested v0.12.7 on Ubuntu 14.04.2 LTS. I plan to build a docker image for this server component in the near future. 

## How it works
Git doesn't offer an easy way to push non-committed changes to a remote repo. Syncer creates commits unattached to any user branch and pushes those to the special `__git-n-sync__` ref on the remote. These commits also have information about the the user's local `HEAD`, namely the branch they are working off and what commit that branch is pointing to.

When the remote receives a commit on the special `__git-n-sync__` ref, it runs a post-receive hook that brings the remote's working directory up to date with the latest commit. It also moves the HEAD on the remote to the user's branch if necessary. After the sync has completed a `git diff` or `git status` on the client should be identical to one on the remote*

*currently the staging area is not copied, so if files are staged diff outpt will not be identical*
