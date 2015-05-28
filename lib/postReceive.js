#! /usr/local/bin/node

var exec = require('child_process').exec;
var fs = require('fs');
//where does this file actually belong?

process.stdin.setEncoding('utf8');

process.stdin.on('readable', function() {
  var chunk = process.stdin.read();
  if (chunk !== null) {
    input += chunk;
  }
});

var input = "";
process.stdin.on('end', function() {
  input = input.split(" ");
  oldSha = input[0];
  newSha = input[1]
  // console.log("OLD SHA", oldSha);
  // console.log("NEW SHA", newSha);

  exec("git show -s --format=\"%s\" " + newSha, function(err, stdout, stderr){
    if(err){
      console.error(err);
      process.exit(err.code);
    } else {
      // console.log("STDOUT", stdout);

      var data = stdout.split(" ");
      var ref = data[0], sha = data[1];
      console.log("SERVER REF", ref);
      console.log("SERVER SHA", sha);
      //should consider only writing if this has changed
      //then something can watch these files for changes w/o them "changing" all the time
      fs.writeFileSync("./HEAD", "ref: " + ref);
      fs.writeFileSync(ref, sha);

      exec("git reset --hard HEAD", {cwd: process.cwd() + "/..", env: {"GIT_DIR": "./.git"}}, function(err, stdout, stderr){
        if (err){
          console.log(stdout);
          console.error(stderr);
          console.log("ERROR RESETTING", err);
        } else {
          console.log(stdout);
          console.error(stderr);          
        }
      })


    }
  })
});
