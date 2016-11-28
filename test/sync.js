const chai = require('chai')
chai.should()
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const rimraf = require('rimraf')
const fs = require('fs')
const Syncer = require('../lib/sync')
const utils = require('../lib/utils')
const nodegit = require('nodegit')

const tmpWorkspace = '.test-tmp'

const sync = (clientDir, remote) => {
  const syncer = new Syncer({srcDir: clientDir, remote})
  syncer.configureServer()
  return syncer.sync()
}

const createRepo = (repo) => {
  return utils.cmd(tmpWorkspace, `git init ${repo}`)
}

const writeRepo = (repo, filepath, contents) => {
  return utils.writeFile(`./${tmpWorkspace}/${repo}/${filepath}`, contents)
}

const gitCheckout = (repo, branch, create = false) => {
  let command = null
  if (create) {
    command = `git checkout -b ${branch}`
  } else {
    command = `git checkout ${branch}`
  }
  return utils.cmd(`${tmpWorkspace}/${repo}`, command)
}

const gitHead = (repo) => {
  return utils.readFile(`${tmpWorkspace}/${repo}/.git/HEAD`).then((contents) => {
    // match = /refs\/heads\/(.*$)/.match(contents)[1]
    // console.log("MATCH", match)
    const head = /refs\/heads\/(.*$)/.exec(contents)[1]
    return Promise.resolve(head)
  })
}

const commitAll = (repo, msg) => {
  utils.cmd(`${tmpWorkspace}/${repo}`, 'git add .').then(() => {
    return utils.cmd(`${tmpWorkspace}/${repo}`, `git commit -m "${msg}"`)
  })
}

const isClean = (repo) => {
  nodegit.Repository.open(`${tmpWorkspace}/#{repo}`).then((repo) => {
    repo.getStatus().then((statuses) => {
      Promise.resolve(statuses.length === 0)
    })
  })
}

const getCommits = (repo) => {
  const commits = []
  nodegit.Repository.open(`#{tmpWorkspace}/#{repo}`).then((repo) => {
    if (repo.isEmpty()) {
      return Promise.resolve(null)
    } else {
      repo.getHeadCommit()
    }
  }).then((firstComitOnMaster) => {
    if (firstComitOnMaster === null) {
      return Promise.resolve(null)
    }
    const history = firstComitOnMaster.history()
    history.on('commit', (commit) => {
      commits.push({msg: commit.message()})
    })
    history.start()
    return new Promise((resolve, reject) => {
      resolve(history)
    })
  }).then((history) => {
    if (history == null) {
      return []
    }
    return new Promise((resolve, reject) => {
      history.on('end', () => {
        resolve(commits)
      })
    })
  })
}

describe('Syncing', function () {
  const readmeContents = 'README'

  const addREADME = (repo, contents = readmeContents) => {
    return writeRepo(repo, 'README.md', contents)
  }

  const fillRepo = (repo) => {
    addREADME(repo)
    .then(() => {
      commitAll(repo, 'commit README')
    }).then(() => {
      writeRepo(repo, 'index.js', "console.log('Helo World');")
    }).then(() => {
      commitAll(repo, 'add index.js')
    })
  }

  beforeEach(function () {
    this.clientDir = `${tmpWorkspace}/client`
    this.remote = `${process.env.USER}@localhost:${process.cwd()}/${tmpWorkspace}/server`
    rimraf.sync(`./#{tmpWorkspace}`)
    fs.mkdirSync(`./#{tmpWorkspace}`)
    const p1 = createRepo('client').then((result) => {
      fillRepo('client')
    })
    const p2 = createRepo('server')
    return Promise.all([p1, p2])
  })

  describe('Non-bare (empty staging area) to bare', function () {
    it('should sync all files', function () {
      Promise.all([
        getCommits('client').should.eventually.have.property('length').equal(2),
        getCommits('server').should.eventually.have.property('length').equal(0)
      ]).next((result) => {
        sync(this.clientDir, this.remote).next(() => {
          Promise.all([
            // TODO add check that user's staging area is kept clean
            // harder than it seems it should be w/ nodegit..
            getCommits('server').should.eventually.have.property('length').equal(2),
            utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal(readmeContents),
            getCommits('client').should.eventually.have.property('length').equal(2),
            isClean('server').should.eventually.equal(true)
          ])
        })
      })
    })
  })

/* TODO convert these tests
it.skip "should sync when both repos are at the same commit, but have not been sycned with syncer", ->
      #TODO this test fails to properly set up two unsynced repos w/
      #identical commits and a normal pointer to master
      #git log on server after push returns fatal: bad default revision 'HEAD'
      newReadme = "New and improved README"
      utils.remoteCmd(process.env.USER, 'localhost', "#{process.cwd()}/#{tmpWorkspace}", "git clone #{process.cwd()}/#{tmpWorkspace}/client server2").then =>
        utils.remoteCmd(process.env.USER, 'localhost', "#{process.cwd()}/#{tmpWorkspace}/server2", "git config receive.denyCurrentBranch ignore").then =>
          utils.cmd(@clientDir, "git push --set-upstream #{@remote}2 master").then =>
            writeRepo("client", "README.md", newReadme).then =>
              sync(@clientDir, "#{@remote}2").next ->
                Promise.all([
                  getCommits('server2').should.eventually.have.property("length").equal(2)
                  getCommits('client').should.eventually.have.property("length").equal(2)
                  utils.readFile("./#{tmpWorkspace}/server2/README.md").should.eventually.equal(newReadme)
                  isClean('server2').should.eventually.equal(false)
              ])

    it "should sync a save that is not committed", ->
      sync(@clientDir, @remote).next =>
        Promise.all([
          getCommits('server').should.eventually.have.property("length").equal(2)
          utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(readmeContents)
          getCommits('client').should.eventually.have.property("length").equal(2)
        ]).next =>
          newReadme = "New and improved README"
          writeRepo("client", "README.md", newReadme).next =>
            sync(@clientDir, @remote).next ->
              Promise.all([
                getCommits('server').should.eventually.have.property("length").equal(2)
                getCommits('client').should.eventually.have.property("length").equal(2)
                utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(newReadme)
                isClean('server').should.eventually.equal(false)
              ])

    it "should handle an unsynced repo with a dirty working copy", ->
      newReadme = "New and improved README"
      writeRepo("client", "README.md", newReadme).next =>
        sync(@clientDir, @remote).next ->
          Promise.all([
            getCommits('server').should.eventually.have.property("length").equal(2)
            getCommits('client').should.eventually.have.property("length").equal(2)
            utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(newReadme)
            isClean('server').should.eventually.equal(false)
          ])

    it "should handle a series of non-committed edits/syncs", ->
      writeRepo("client", "README.md", "v2")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v2")
      .then =>
        writeRepo("client", "README.md", "v3")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v3")
      .then =>
        writeRepo("client", "README.md", "v4")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v4")

    #TODO better name up here..
    it "should handle a commit on the client after a sync has occurred", ->
      writeRepo("client", "README.md", "v2")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v2")
      .then =>
        writeRepo("client", "README.md", "v3")
      .then =>
        commitAll("client", "A new commit is upon us")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v3")
      .then =>
        writeRepo("client", "README.md", "v4")
      .then =>
        sync(@clientDir, @remote)
      .then =>
         utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal("v4")

    it "should handle a non-master branch", ->
      gitCheckout("client", "devel", true).then =>
        sync(@clientDir, @remote).then ->
          Promise.all([
            getCommits('server').should.eventually.have.property("length").equal(2)
            getCommits('client').should.eventually.have.property("length").equal(2)
            gitHead("server").should.eventually.equal("devel")
            isClean('server').should.eventually.equal(true)
          ])

    it "should handle a branch switch w/ a dirty repo", ->
      newReadme = "New and improved README"
      writeRepo("client", "README.md", newReadme).then =>
        sync(@clientDir, @remote).then =>
          gitCheckout("client", "devel", true).then =>
            sync(@clientDir, @remote).then ->
              Promise.all([
                getCommits('server').should.eventually.have.property("length").equal(2)
                getCommits('client').should.eventually.have.property("length").equal(2)
                gitHead("server").should.eventually.equal("devel")
                isClean('server').should.eventually.equal(false)
                utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(newReadme)
              ])

    it "should properly switch to branch that is behind master", ->
      #should i do this style more often, more lines, less indentation?
      gitCheckout("client", "devel", true)
      .then =>
        gitCheckout("client", "master")
      .then =>
        writeRepo("client", 'index.js', "console.log('Master Work');")
      .then =>
        commitAll("client", "master commit")
      .then =>
          getCommits('client').should.eventually.have.property("length").equal(3)
      .then =>
        gitCheckout("client", "devel")
      .then =>
        sync(@clientDir, @remote)
      .then ->
        Promise.all([
          getCommits('server').should.eventually.have.property("length").equal(2)
          getCommits('client').should.eventually.have.property("length").equal(2)
          gitHead("server").should.eventually.equal("devel")
          isClean('server').should.eventually.equal(true)
        ])

    it "should properly switch to branch that is behind master w/ extra files/edits", ->
      newReadme = "Enhanced README"
      gitCheckout("client", "devel", true)
      .then =>
        gitCheckout("client", "master")
      .then =>
        writeRepo("client", 'index.js', "console.log('Master Work');")
      .then =>
        commitAll("client", "master commit")
      .then =>
        getCommits('client').should.eventually.have.property("length").equal(3)
      .then =>
        writeRepo("client", "README.md", newReadme)
      .then =>
        gitCheckout("client", "devel")
      .then =>
        sync(@clientDir, @remote)
      .then ->
        Promise.all([
          getCommits('server').should.eventually.have.property("length").equal(2)
          getCommits('client').should.eventually.have.property("length").equal(2)
          gitHead("server").should.eventually.equal("devel")
          isClean('server').should.eventually.equal(false)
          utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(newReadme)
        ])

    it "is idempotent"

    it "should handle a commit amendment"

    it "should respond properly to a git pull"

    it "syncs correctly when some files are staged"

    it "should handle an empty repo"

    it "handles deletes"
*/
})
