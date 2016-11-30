const repl = require('repl')
const _ = require('underscore')

_.extend(global, require('./test/utils'))

const createTimeoutPromise = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('yoyoyo')
    }, 4000)
  })
}

_.extend(global, createTimeoutPromise)

const isPromise = (value) => {
  if (typeof value === 'object') {
    return Object.getPrototypeOf(value) === Promise.prototype
  } else {
    return false
  }
}

const runLine = (cmd, context, filename, callback) => {
  const result = eval(cmd)
  if (!isPromise(result)) {
    callback(result)
  } else {
    result.then((value) => {
      callback(value)
    }).catch((failure) => {
      callback(failure)
    })
  }
}

repl.start({prompt: '> ', eval: runLine})
