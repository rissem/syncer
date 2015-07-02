chai = require('chai');
chai.should();
chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

rimraf = require "rimraf"
fs = require 'fs'
Promise = require 'lie'
nodegit = require "nodegit"
sync = require '../lib/sync'
utils = require '../lib/utils'

tmpWorkspace = ".test-tmp"

#TODO path independent filenames

Promise.prototype.next = (func)->
  new Promise (resolve, reject)=>
    this.then (result)->
      func(result).then (result)->
        resolve(result)
      , (reason)->
        reject(reason)
      .catch (e)->
        reject(e)
    , (reason)->
      reject(reason)
      return this
    .catch (e)->
      reject(e)

createRepo = (repo)->
  utils.cmd tmpWorkspace, "git init #{repo}"

writeRepo = (repo, filepath, contents)->
  utils.writeFile "./#{tmpWorkspace}/#{repo}/#{filepath}", contents

configureServer = (repo)->
  Promise.all [
    #allow pushing to the active branch
    utils.cmd "./#{tmpWorkspace}/#{repo}", "git config receive.denyCurrentBranch ignore"
    utils.readFile("lib/postReceive.js").then (contents)->
      writeRepo(repo, ".git/hooks/post-receive", contents).then (filepath)->
        utils.cmd process.cwd(), "chmod 755 #{filepath}" #TODO should probably do this w/o shelling out
  ]
  # at some point creating the server repo should create docker
  # container + http proxy in front of it
  # also this should exist as part of the app not part of the tests

commitAll = (repo, msg)->
  utils.cmd "#{tmpWorkspace}/#{repo}", "git add ."
  .then ->
    utils.cmd "#{tmpWorkspace}/#{repo}", "git commit -m \"#{msg}\""
  
getCommits = (repo)->
  commits = []
  nodegit.Repository.open("#{tmpWorkspace}/#{repo}")
  .then (repo) ->
    if repo.isEmpty()
      return Promise.resolve null
    else
      repo.getMasterCommit()
  .then (firstComitOnMaster) ->
    if firstComitOnMaster == null
      return Promise.resolve null
    history = firstComitOnMaster.history()

    history.on "commit", (commit)->
      commits.push {msg: commit.message()}

    history.start()
    return new Promise (resolve, reject)->
      resolve(history)
  .then (history)->
    if history == null
      return []
    return new Promise (resolve, reject)->
      history.on "end", ->
        resolve(commits)

describe 'Syncing', ->
  readmeContents = "README"

  addREADME = (repo, contents=readmeContents)->
    writeRepo(repo, "README.md", contents)

  fillRepo = (repo)->
    addREADME repo
    .then ->
      commitAll(repo, "commit README")
    .then ->
      writeRepo(repo, 'index.js', "console.log('Helo World');")
    .then ->
      commitAll(repo, "add index.js")

  beforeEach ->
    @clientDir = "#{tmpWorkspace}/client"
    @remote = "#{process.env.USER}@localhost:#{process.cwd()}/#{tmpWorkspace}/server"
    #remove tmp dir if it exists
    rimraf.sync("./#{tmpWorkspace}")
    fs.mkdirSync("./#{tmpWorkspace}")
    p1 = createRepo("client").then((result)->
      fillRepo("client"))
    p2 = createRepo("server").then (result)->
      configureServer("server")
    Promise.all([p1,p2])
    
  describe 'Non-bare (empty staging area) to bare', ->
    it 'should sync all files', ->
      Promise.all([
        getCommits('client').should.eventually.have.property("length").equal(2),
        getCommits('server').should.eventually.have.property("length").equal(0)
      ]).next (result)=>
        sync(@clientDir, @remote).next ->
          Promise.all([
            getCommits('server').should.eventually.have.property("length").equal(2)
            utils.readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(readmeContents)
            getCommits('client').should.eventually.have.property("length").equal(2)
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
              ])


    it "should handle an unsynced repo with a dirty working copy"

    it "remote repo should be clean after the user makes a commit"

    it "should handle a branch switch"

    it "should handle a commit amendment"

    it "should respond properly to a git pull"

    it "is ok if some files are staged"

    it "should handle an empty repo"

    it "is idempotent"
