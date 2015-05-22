assert = require('chai').assert
rimraf = require "rimraf"
fs = require 'fs'
exec = require('child_process').exec
Promise = require('lie')

tmpWorkspace = ".test-tmp"

runCmd = (cmd, dir=tmpWorkspace)->
  new Promise (resolve, reject)->
    exec cmd, (err, stdout, stderr)->
      console.error stderr if stderr
      console.log stdout if stdout
      if err
        reject err
      else
        resolve {stdout, stderr}

addFile = (repo, path, contents)->
  new Promise (resolve, reject)->
    filepath = "./#{tmpWorkspace}/#{repo}/#{path}"
    fs.writefile filepath, contents, (err)->
      if err
        reject err
      else
        resolve filepath

createRepo = (repo)->
  runCmd "git init #{repo}"

commitAll = (repo, msg)->
  runCmd("git add .", "#{tmpWorkspace}/#{repo}").then(
    runCmd("git commit -m #{msg}"))
  
addREADME = (repo, contents="README")->
  addFile(repo, "README.md")

fillRepo = (repo)->
  addREADME(repo).then(
    commitAll(repo, "commit README")).then(
      addFile(repo, 'index.js', "console.log('Helo World');")).then(
        commitAll(repo, "add index.js file"))

describe 'Syncing', ->
  beforeEach (done)->
    #remove tmp dir if it exists
    rimraf.sync("./#{tmpWorkspace}")
    fs.mkdirSync("./#{tmpWorkspace}")
    p1 = createRepo("client").then((repo)->
      fillRepo(repo))
    p2 = createRepo("server")
    Promise.all([p1,p2]).then((answer)->
      done()
    ).catch(console.log.bind(console))
    
  describe 'Non-bare to bare', ->
    it 'should sync all files', ->
      console.log("HOORAH")
