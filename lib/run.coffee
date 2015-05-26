Promise = require 'lie'
exec = require('child_process').exec

module.exports = cmd: (cmd, dir)->
  console.log "RUN CMD #{cmd}" if process.env.DEBUG
  new Promise (resolve, reject)->
    exec cmd, {cwd: dir}, (err, stdout, stderr)->
      console.error stderr if stderr
      console.log stdout if stdout and process.env.DEBUG
      if err
        reject(Error(err))
      else
        resolve {stdout, stderr}
