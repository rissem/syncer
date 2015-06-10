Promise = require 'lie'
exec = require('child_process').exec

module.exports =
  cmd: (dir, cmd, options={})->
    console.log "RUN CMD #{cmd}" if process.env.DEBUG
    new Promise (resolve, reject)->
      exec cmd, {cwd: dir}, (err, stdout, stderr)->
        console.error stderr if stderr
        console.log stdout if stdout and process.env.DEBUG
        if err
          console.log stdout if stdout and process.env.DEBUG
          console.error stderr if stderr and process.env.DEUBG
          reject(Error(err))
        else
          resolve {stdout, stderr}

  readFile: (filename)->
    new Promise (resolve, reject)->
      fs.readFile filename, 'utf-8', (err,data)->
        if err
          reject err
        else
          resolve data

