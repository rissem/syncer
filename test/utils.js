const utils = require('../lib/utils')
const Syncer = require('../lib/sync')
const tmpWorkspace = '.test-tmp'

let testUtils = {
  sync: (clientDir, remote) => {
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

  addREADME: (repo, contents = 'README') => {
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
    return utils.cmd(`${tmpWorkspace}/${repo}`, 'git add .').then(() => {
      return utils.cmd(`${tmpWorkspace}/${repo}`, `git commit -m "${msg}"`)
    })
  },

  isClean: (repo) => {
    return utils.cmd(`${tmpWorkspace}/${repo}`, 'git diff --shortstat').then((result) => {
      return Promise.resolve(result.stdout === '')
    })
  },

  getCommits: (repo) => {
    const cmd = `git log --pretty=format:"%H:%s"`
    return utils.cmd(`${tmpWorkspace}/${repo}`, cmd).then(({stdout, err}) => {
      if (err) {
        return Promise.resolve([])
      } else {
        return Promise.resolve(stdout.split('\n').map((line) => {
          const [hash, message] = line.split(':')
          return {hash, message}
        }))
      }
    })
  }
}

module.exports = testUtils
