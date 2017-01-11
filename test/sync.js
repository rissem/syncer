/* eslint-env node, mocha */

const chai = require('chai')
chai.should()
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const rimraf = require('rimraf')
const fs = require('fs')
const tu = require('./utils')
const utils = require('../lib/utils')

// TODO don't duplicate this constant
const tmpWorkspace = '.test-tmp'

describe('Syncing', function () {
  const readmeContents = 'README'

  beforeEach(function () {
    this.clientDir = `${tmpWorkspace}/client`
    this.remote = `${process.env.USER}@localhost:${process.cwd()}/${tmpWorkspace}/server`
    rimraf.sync(`./${tmpWorkspace}`)
    fs.mkdirSync(`./${tmpWorkspace}`)
    const p1 = tu.createRepo('client').then((result) => {
      return tu.fillRepo('client')
    })
    const p2 = tu.createRepo('server')
    return Promise.all([p1, p2])
  })

  describe('Non-bare (empty staging area) to bare', function () {
    it('should sync all files', function () {
      return Promise.all([
        tu.getCommits('client').should.eventually.have.property('length').equal(2),
        tu.getCommits('server').should.eventually.have.property('length').equal(0)
      ]).then((result) => {
        return tu.sync(this.clientDir, this.remote).then(() => {
          return Promise.all([
            // TODO add check that user's staging area is kept clean
            tu.getCommits('server').should.eventually.have.property('length').equal(2),
            utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal(readmeContents),
            tu.getCommits('client').should.eventually.have.property('length').equal(2),
            tu.isClean('server').should.eventually.equal(true)
          ])
        })
      })
    })
  })

  it('should sync a save that is not committed', function () {
    return tu.sync(this.clientDir, this.remote).then(() => {
      return Promise.all([
        tu.getCommits('server').should.eventually.have.property('length').equal(2),
        utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal(readmeContents),
        tu.getCommits('client').should.eventually.have.property('length').equal(2)
      ])
    }).then(() => {
      const newReadme = 'New and improved README'
      return tu.writeRepo('client', 'README.md', newReadme).then(() => {
        return tu.sync(this.clientDir, this.remote).then(() => {
          return Promise.all([
            tu.getCommits('server').should.eventually.have.property('length').equal(2),
            tu.getCommits('client').should.eventually.have.property('length').equal(2),
            utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal(newReadme),
            tu.isClean('server').should.eventually.equal(false)
          ])
        })
      })
    })
  })

  it('should handle an unsynced repo with a dirty working copy', function () {
    const newReadme = 'New and improved README'
    return tu.writeRepo('client', 'README.md', newReadme).then(() => {
      return tu.sync(this.clientDir, this.remote).then(() => {
        return Promise.all([
          tu.getCommits('server').should.eventually.have.property('length').equal(2),
          tu.getCommits('client').should.eventually.have.property('length').equal(2),
          utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal(newReadme),
          tu.isClean('server').should.eventually.equal(false)
        ])
      })
    })
  })

  it('should handle a series of non-committed edits/syncs', function () {
    return tu.writeRepo('client', 'README.md', 'v2')
    .then(() => {
      return tu.sync(this.clientDir, this.remote)
    })
    .then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v2')
    }).then(() => {
      return tu.writeRepo('client', 'README.md', 'v3')
    }).then(() => {
      return tu.sync(this.clientDir, this.remote)
    }).then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v3')
    }).then(() => {
      return tu.writeRepo('client', 'README.md', 'v4')
    }).then(() => {
      return tu.sync(this.clientDir, this.remote)
    }).then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v4')
    })
  })

  it.only('should handle a commit on the client after a sync has occurred', function () {
    tu.writeRepo('client', 'README.md', 'v2')
    .then(() => {
      return tu.sync(this.clientDir, this.remote)
    })
    .then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v2')
    })
    .then(() => {
      return tu.writeRepo('client', 'README.md', 'v3')
    })
    .then(() => {
      return tu.commitAll('client', 'A new commit is upon us')
    })
    .then(() => {
      return tu.sync(this.clientDir, this.remote)
    })
    .then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v3')
    })
    .then(() => {
      return tu.writeRepo('client', 'README.md', 'v4')
    }).then(() => {
      return tu.sync(this.clientDir, this.remote)
    })
    .then(() => {
      return utils.readFile(`./${tmpWorkspace}/server/README.md`).should.eventually.equal('v4')
    })
  })

/*
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
