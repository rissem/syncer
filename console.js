const repl = require('repl')
const _ = require('underscore')
const testUtils = require('./test/utils')

_.extend(global, require('./test/utils'))
_.extend(global, require('./lib/utils'))

const isPromise = (value) => {
  if (typeof value === 'object') {
    return Object.getPrototypeOf(value) === Promise.prototype
  } else {
    return false
  }
}

//_cmd so we can have a fucntion called cmd in global context
//pretty straightforward eval, except it waits for promises
const runLine = (_cmd, context, filename, callback) => {
  const result = eval(_cmd)
  if (!isPromise(result)) {
    callback(null, result)
  } else {
    result.then((value) => {
      callback(null, value)
    }).catch((failure) => {
      callback(failure)
    })
  }
}

const myWriter = function(output) {
  if (typeof output === 'object'){
    return JSON.stringify(output)
  } else {
    return output
  }
}

repl.start({prompt: '> ', eval: runLine, writer: myWriter})
