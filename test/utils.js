const utils = require('../lib/utils')
const Syncer = require('../lib/sync')
const tmpWorkspace = '.test-tmp'

let testUtils = {
  sync: (clientDir, remote) => {
    console.log("syncing...")
    const syncer = new Syncer({srcDir: clientDir, remote})
    syncer.configureServer()
    return syncer.sync()
  },

  createRepo: (repo) => {
    return utils.cmd(tmpWorkspace, `git init ${repo}`)
  },

  writeRepo: (repo, filepath, contents) => {
    return utils.writeFile(`./${tmpWorkspace}/${repo}/${filepath}`, contents)
  },

  addREADME: (repo, contents = "README") => {
    return module.exports.writeRepo(repo, 'README.md', contents)
  },

  fillRepo: (repo) => {
    return testUtils.addREADME(repo)
    .then(() => {
      return testUtils.commitAll(repo, 'commit README')
    }).then(() => {
      return testUtils.writeRepo(repo, 'index.js', "console.log('Helo World');")
    }).then(() => {
      return testUtils.commitAll(repo, 'add index.js')
    })
  },

  gitCheckout: (repo, branch, create = false) => {
    let command = null
    if (create) {
      command = `git checkout -b ${branch}`
    } else {
      command = `git checkout ${branch}`
    }
    return utils.cmd(`${tmpWorkspace}/${repo}`, command)
  },

  gitHead: (repo) => {
    return utils.readFile(`${tmpWorkspace}/${repo}/.git/HEAD`).then((contents) => {
      // match = /refs\/heads\/(.*$)/.match(contents)[1]
      // console.log("MATCH", match)
      const head = /refs\/heads\/(.*$)/.exec(contents)[1]
      return Promise.resolve(head)
    })
  },

  commitAll: (repo, msg) => {
    console.log("committing", repo, msg)
    return utils.cmd(`${tmpWorkspace}/${repo}`, 'git add .').then(() => {
      return utils.cmd(`${tmpWorkspace}/${repo}`, `git commit -m "${msg}"`)
    })
  },

  isClean: (repo) => {
    return utils.cmd(`${tmpWorkspace}/${repo}`, 'git diff --shortstat').then((result) => {
      return Promise.resolve(result.stdout === "")
    })
  },

  getCommits: (repo) => {
    const commits = []
    const cmd = `git log --pretty=format:"%H:%s"`
    return utils.cmd(`${tmpWorkspace}/${repo}`, cmd).then((result) => {
      return Promise.resolve(result.stdout.split('\n').map((line) => {
        const [hash, message] = line.split(':')
        return {hash, message}
      }))
    }, (err) => {
      //TODO hack, handle more elegantly in future
      return Promise.resolve([])
    })
    // nodegit.Repository.open(`#{tmpWorkspace}/#{repo}`).then((repo) => {
    //   if (repo.isEmpty()) {
    //     return Promise.resolve(null)
    //   } else {
    //     repo.getHeadCommit()
    //   }
    // }).then((firstComitOnMaster) => {
    //   if (firstComitOnMaster === null) {
    //     return Promise.resolve(null)
    //   }
    //   const history = firstComitOnMaster.history()
    //   history.on('commit', (commit) => {
    //     commits.push({msg: commit.message()})
    //   })
    //   history.start()
    //   return new Promise((resolve, reject) => {
    //     resolve(history)
    //   })
    // }).then((history) => {
    //   if (history == null) {
    //     return []
    //   }
    //   return new Promise((resolve, reject) => {
    //     history.on('end', () => {
    //       resolve(commits)
    //     })
    //   })
    // })
  }
}

module.exports = testUtils
