chai = require('chai');
chai.should();
chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

rimraf = require "rimraf"
fs = require 'fs'
Promise = require 'lie'
nodegit = require "nodegit"
sync = require '../lib/sync'
run = require '../lib/run'

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

addFile = (repo, path, contents)->
  new Promise (resolve, reject)->
    filepath = "./#{tmpWorkspace}/#{repo}/#{path}"
    fs.writeFile filepath, contents, (err)->
      if err
        reject Error(err) # better way to add this information to the stack trace?
      else
        resolve filepath

readFile = (filename)->
  new Promise (resolve, reject)->
    fs.readFile filename, 'utf-8', (err,data)->
      if err
        reject err
      else
        resolve data

createRepo = (repo)->
  run.cmd "git init #{repo}", tmpWorkspace

configureServer = (repo)->
  Promise.all [
    #allow pushing to the active branch
    run.cmd "git config receive.denyCurrentBranch ignore", "./#{tmpWorkspace}/#{repo}"
    readFile("lib/postReceive.js").then (contents)->
      addFile(repo, ".git/hooks/post-receive", contents).then (filepath)->
        run.cmd "chmod 755 #{filepath}" #TODO should probably do this w/o shelling out
  ]
  # at some point creating the server repo should create docker
    # container + http proxy in front of it
  # also this should exist as part of the app not part of the tests

commitAll = (repo, msg)->
  run.cmd "git add .", "#{tmpWorkspace}/#{repo}"
  .then ->
    run.cmd "git commit -m \"#{msg}\"", "#{tmpWorkspace}/#{repo}"
  
getCommits = (repo)->
  commits = []
  nodegit.Repository.open("#{tmpWorkspace}/#{repo}")
  .then (repo) ->
    if repo.isEmpty()
      return new Promise (resolve, reject)->
        resolve(null)
    else
      repo.getMasterCommit()
  .then (firstComitOnMaster) ->
    if firstComitOnMaster == null
      return new Promise (resolve, reject)->
        resolve(null)
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
    addFile(repo, "README.md", contents)

  fillRepo = (repo)->
    addREADME repo
    .then ->
      commitAll(repo, "commit README")
    .then ->
      addFile(repo, 'index.js', "console.log('Helo World');")
    .then ->
      commitAll(repo, "add index.js")

  beforeEach (done)->
    #remove tmp dir if it exists
    rimraf.sync("./#{tmpWorkspace}")
    fs.mkdirSync("./#{tmpWorkspace}")
    p1 = createRepo("client").then((result)->
      fillRepo("client"))
    p2 = createRepo("server").then (result)->
      configureServer("server")
    Promise.all([p1,p2]).then((answer)->
      done()
    ).catch((e)->
      console.log(e)
      console.log(e.stack)
    )
    
  describe 'Non-bare (empty staging area) to bare', ->
    it 'should sync all files', ->
      Promise.all([
        getCommits('client').should.eventually.have.property("length").equal(2),
        getCommits('server').should.eventually.have.property("length").equal(0)
      ]).next (result)->
        remote = "#{process.env.USER}@localhost:#{process.cwd()}/#{tmpWorkspace}/server"
        sync("#{tmpWorkspace}/client", remote).next ->
          Promise.all([
            getCommits('server').should.eventually.have.property("length").equal(2)
            readFile("./#{tmpWorkspace}/server/README.md").should.eventually.equal(readmeContents)
            getCommits('client').should.eventually.have.property("length").equal(2)
          ])

