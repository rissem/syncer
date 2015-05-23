Promise = require 'lie'

sync = (srcDir, remote)->
  new Promise (resolve, reject)->
    resolve("success")

module.exports = sync
