Promise = require 'lie'
exec = require('child_process').exec
fs = require 'fs'

module.exports =
  cmd: (dir, cmd, options={})->
    console.log "RUN CMD #{cmd}" if process.env.DEBUG
    new Promise (resolve, reject)->
      options.cwd = dir #unless options.cwd
      exec cmd, options, (err, stdout, stderr)->
        console.error stderr if stderr
        console.log stdout if stdout and process.env.DEBUG
        if err
          reject(Error(err))
        else
          resolve {stdout, stderr}

  remoteCmd: (user, host, dir, cmd, options={})->
    module.exports.cmd ".", "ssh #{user}@#{host} cd #{dir} && #{cmd}", options

  writeRemoteFile: (user, host, dir, file)->
    console.log("WRITING REMOTE FILE", file)
    module.exports.cmd ".", "scp #{file} #{user}@#{host}:#{dir}"

  readFile: (filename)->
    new Promise (resolve, reject)->
      fs.readFile filename, 'utf-8', (err,data)->
        if err
          reject err
        else
          resolve data

  writeFile: (filepath, contents)->
    new Promise (resolve, reject)->
      fs.writeFile filepath, contents, (err)->
        if err
          reject Error(err) # better way to add this information to the stack trace?
        else
          resolve filepath
