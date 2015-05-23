expect = require('chai').expect
rimraf = require "rimraf"
fs = require 'fs'
exec = require('child_process').exec
Promise = require('lie')
nodegit = require("nodegit")

tmpWorkspace = ".test-tmp"

runCmd = (cmd, dir=tmpWorkspace)->
  console.log "RUN CMD #{cmd}" if process.env.DEBUG
  new Promise (resolve, reject)->
    exec cmd, {cwd: dir}, (err, stdout, stderr)->
      console.error stderr if stderr
      console.log stdout if stdout and process.env.DEBUG
      if err
        reject(Error(err))
      else
        resolve {stdout, stderr}

addFile = (repo, path, contents)->
  new Promise (resolve, reject)->
    filepath = "./#{tmpWorkspace}/#{repo}/#{path}"
    fs.writeFile filepath, contents, (err)->
      if err
        reject Error(err) # better way to add this information to the stack trace?
      else
        resolve filepath

createRepo = (repo)->
  runCmd "git init #{repo}"

commitAll = (repo, msg)->
  runCmd "git add .", "#{tmpWorkspace}/#{repo}"
  .then ->
    runCmd "git commit -m \"#{msg}\"", "#{tmpWorkspace}/#{repo}"
  
addREADME = (repo, contents="README")->
  addFile(repo, "README.md", contents)

fillRepo = (repo)->
  addREADME repo
  .then ->
    commitAll(repo, "commit README")
  .then ->
    addFile(repo, 'index.js', "console.log('Helo World');")
  .then ->
    commitAll(repo, "add index.js file")

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
  beforeEach (done)->
    #remove tmp dir if it exists
    rimraf.sync("./#{tmpWorkspace}")
    fs.mkdirSync("./#{tmpWorkspace}")
    p1 = createRepo("client").then((result)->
      fillRepo("client"))
    p2 = createRepo("server")
    Promise.all([p1,p2]).then((answer)->
      done()
    ).catch((e)->
      console.log(e)
      console.log(e.stack)
    )
    
  describe 'Non-bare to bare', ->
    it 'should sync all files', (done)->
      #really these commits should both be fetched in parallel..
      getCommits("client")
      .then (commits)->
        expect(commits.length).to.equal(2)
        getCommits("server")
        .then (commits)->
          expect(commits.length).to.equal(0)
          done()

      
