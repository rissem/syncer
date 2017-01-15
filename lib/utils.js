const exec = require('child_process').exec
const fs = require('fs')

module.exports = {
  cmd: (dir, cmd, options = {}) => {
    let start = Date.now()
    if (process.env.DEBUG) {
      console.log(`RUN CMD ${cmd}, ${dir}`)
    }
    return new Promise((resolve, reject) => {
      options.cwd = dir
      exec(cmd, options, (err, stdout, stderr) => {
        if (process.env.DEBUG) {
          if (stderr) {
            console.error(stderr)
          }
          if (stdout) {
            console.log(stdout)
          }
        }
        if (process.env.DEBUG) {
          console.log(`completed command ${dir} ${cmd} in ${Date.now() - start} ms`)
        }
        resolve({err, stdout, stderr})
      })
    })
  },

  remoteCmd: (user, host, dir, cmd, options = {}) => {
    return module.exports.cmd('.', `ssh ${user}@${host} "cd ${dir} && ${cmd}"`, options)
  },

  writeRemoteFile: (user, host, dir, file) => {
    return module.exports.cmd('.', `scp ${file} ${user}@${host}:${dir}`)
  },

  readFile: (filename) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filename, 'utf-8', (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  },

  writeFile: (filepath, contents) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filepath, contents, (err) => {
        if (err) {
          reject(Error(err)) // better way to add this information to the stack trace?
        } else {
          resolve(filepath)
        }
      })
    })
  }
}
