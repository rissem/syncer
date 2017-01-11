const spawn = require('child_process').spawn

module.exports = {
  create: ({user, host, forwards}) => {
    const options = [
      `User ${user}`,
      'ControlMaster auto',
      'ExitOnForwardFailure yes',
      // %h = host, %p port, %r user
      'ControlPath ~/.ssh/ssh_mux_%h_%p_%r'
    ]
    options.push(forwards.map((forward) => {
      return `LocalForward ${forward}`
    }))
    const args = options.map((opt) => `-o ${opt}`)
    args.push('-N') // do not execute remote command
    args.push(host)
//    console.log(`running tunnel command ssh ${args.join(' ')}`)
    const ssh = spawn('ssh', args)

    ssh.stdout.on('data', (data) => {
      console.log(`tunnel stdout: ${data}`)
    })

    ssh.stderr.on('data', (data) => {
      console.log(`tunnel stderr: ${data}`)
    })

    ssh.on('close', (code) => {
      console.log(`tunnel process exited with code ${code}`)
    })
  }
}
