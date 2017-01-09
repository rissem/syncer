const utils = require('./utils')
const GIT_INDEX_FILE = '.git/index-git-n-sync'
const path = require('path')
const _ = require('underscore')
// const tray = require('./tray')

const SYNCER_REF = '__git-n-sync__/head'

// breaks apart a string into its components
// TODO show example string here
// does this belong in utils?
const remoteToComponents = (remote) => {
  const [arg1, arg2] = remote.split(':')
  const username = arg1.split('@')[0]
  const host = arg1.split('@')[1]
  const dir = arg2.split('.git')[0]
  return {username, host, dir}
}

class Syncer {
  // TODO
  // turn srcDir into an absolute path
  // add tests to make sure the user's index is kept clean
  constructor ({srcDir, remote, verbose}) {
    this.srcDir = srcDir
    this.remote = remote
    this.verbose = verbose
    this.newSyncNeeded = false
  }

  // TODO figure out a less clunky way to do this
  // at some point creating the server repo should create docker
  // container + http proxy in front of it
  configureServer () {
    const {username, host, dir} = remoteToComponents(this.remote)
    const destination = `${dir}/.git/hooks/post-receive`
    return Promise.all([
      // allow pushing to the active branch
      utils.remoteCmd(username, host, dir, 'git config receive.denyCurrentBranch ignore'),
      utils.writeRemoteFile(username, host, destination, `${__dirname}/postReceive.js`)
    ])
  }

  // returns ref and branch pointed to by HEAD, ex: {ref: "refs/heads/master" sha: "4ebd20c3b676a7680e07ae382e8d280c6a0e67f6"}
  getHead () {
    return utils.readFile(path.join(this.srcDir, '.git', 'HEAD')).then((contents) => {
      // example contents of .git/HEAD file would be something like
      // ref: /refs/heads/master, ref would be /refs/heads/master
      const ref = /ref: (.*)\n?/.exec(contents)[1]
      return utils.readFile(path.join(this.srcDir, '.git', ref)).then((file) => {
        const sha = file.split('\n')[0]
        return Promise.resolve({ref, sha})
      }, (err) => {
        return Promise.resolve({err})
      })
    })
  }

  // create a fake commit w/ last known user commit and working branch encoded in message
  commitWorkingDir (parentCommit, message) {
    // GIT_INDEX_FILE env variable allows you to stage files w/o in a separate file,
    // this prevents corruption of the user's staging area
    return utils.cmd(this.srcDir, 'git add -A .', {env: {GIT_INDEX_FILE}}).then(() => {
      return utils.cmd(this.srcDir, 'git write-tree', {env: {GIT_INDEX_FILE}}).then(({stdout, stderr}) => {
        if (stderr) {
          console.error(stderr)
        }
        const treeHash = stdout.split('\n')[0]
        const command = `git commit-tree ${treeHash} -p ${parentCommit} -m "${message}"\n`
        return utils.cmd(this.srcDir, command).then(({stdout, stderr}) => {
          if (stderr) {
            console.error(stderr)
          }
          const commitHash = stdout.split('\n')[0]
          return Promise.resolve(commitHash)
        })
      })
    })
  }
  _commitAndPush () {
    const syncStart = Date.now()
    return this.getHead(this.srcDir).then(({ref, sha}) => {
      const message = `git-n-sync commit, you probably shouldn't be seeing this\n\n${ref} ${sha}`
      return this.commitWorkingDir(sha, message).then((commitHash) => {
        return utils.cmd(this.srcDir, `git update-ref refs/${SYNCER_REF} ${commitHash}`).then(() => {
          const command = `git push --force ${this.remote} refs/${SYNCER_REF}:refs/${SYNCER_REF}`
          return utils.cmd(this.srcDir, command).then(({stdout, stderr}) => {
            if (this.verbose) {
              console.log(stdout)
              console.error(stderr)
            }
            const syncData = this.processRemoteOutput(stderr)
            _.extend(syncData, {duration: Date.now() - syncStart})
            this.syncInProgress = false
            // tray.setSynced()
            if (this.nextSync) {
              const tmp = this.nextSync
              this.nextSync = null
              return tmp()
            }
            return Promise.resolve(syncData)
          })
        })
      })
    })
  }

  // if no sync is in progress, sync and return results
  // if sync is in progress, make sure a new sync happens after
  sync () {
    if (this.syncInProgress) {
      if (!this.nextSync) {
        this.nextSync = () => {
          // console.log("subsequent sync beginning")
          return new Promise(this.sync())
        }
      }
      return Promise.resolve(null)
    } else {
      this.syncInProgress = true
      // tray.setSyncing()
      // if a sync is in progress then just queue this up
      return this._commitAndPush()
    }
  }

  processRemoteOutput (remoteOutput) {
    // try parsing remote output
    // if we can't parse it just spit it all out and return an error

    // Other info we need or would be nice
    // last sync time
    // did a branch switch occur
    // was this the first sync ever?

    // strip out the 'remote:' prefix
    // console.log "raw output", remoteOutput if @verbose

    const output = _.reduce(remoteOutput.split('\n'), (memo, line) => {
      return memo + (line.split('remote: ')[1] || '') + '\n'
    }, '')

    // hack for multi line regex
    const summaryDiffRegex = /<SUMMARY DIFF>([.\s\S]*)<\/SUMMARY DIFF>/
    if (!summaryDiffRegex.test(output)) {
      console.log('!!!!!!!!!!!!!!!!!!')
      console.log('UNEXPECTED FAILURE')
      console.log('!!!!!!!!!!!!!!!!!!')
      console.log(remoteOutput)
      process.exit(1)
      return
    }

    const summaryDiff = summaryDiffRegex.exec(output)[1]

    let updates = []
    for (const index in summaryDiff.split('\n')) {
      let line = summaryDiff[index]
      let match = /\s([A-Z])\s*([\S]*)\s*/.exec(line)
      if (match) {
        /* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^line" }] */
        const [, action, filename] = match
        if (action === 'M') {
          updates.push({action: 'Updated', filename})
        }
        if (action === 'A') {
          updates.push({action: 'Added', filename})
        }
        if (action === 'D') {
          updates.push({action: 'Deleted', filename})
        }
        if (action === 'R') {
          updates.push({action: 'Renamed', filename})
        }
        if (action === 'C') {
          updates.push({action: 'Copied', filename})
        }
      }
    }
    return {updates}
  }
}
module.exports = Syncer
