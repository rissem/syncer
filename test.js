const Mocha = require('mocha')
const fs = require('fs')
const path = require('path')

const mocha = new Mocha()
const testDir = path.join(__dirname, 'test')

fs.readdirSync(testDir).forEach((file) => {
  mocha.addFile(path.join(testDir, file))
})

mocha.run((result) => {
  process.exit(result)
})
