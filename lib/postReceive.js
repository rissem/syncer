#! /usr/local/bin/node

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
//where does this file actually belong?

process.stdin.setEncoding('utf8');

process.stdin.on('readable', function() {
  var chunk = process.stdin.read();
  if (chunk !== null) {
    input += chunk;
  }
});

var isHeadCurrent = function(ref,sha){
  var currentRef = fs.readFileSync("./HEAD", "utf-8");
  if (!currentRef){
    return false;
  }
  //current ref is of form "ref: refs/heads/master"
  currentRef = currentRef.split(": ")[1];
  if (!fs.existsSync("./" + currentRef)){
    // console.log("CURRENT REF DOES NOT EXIST", currentRef);
    return false;
  }
  var currentSha = fs.readFileSync("./"+ currentRef, "utf-8").split("\n")[0];
  return ref === currentRef && sha === currentSha;
};

var applyDiff = function(oldSha, newSha, cb){
  var diff = spawn("git", ["diff", oldSha, newSha]);
  //TODO patch currently fails when the diff is empty
  var patch = spawn("git", ["apply", "-"], {cwd: process.cwd() + "/.."});
  diff.stderr.on("data", function(data){
    console.error("ERROR", data.toString());
  });
  diff.stdout.on("data", function(data){
    patch.stdin.write(data);
  });
  diff.on("close", function(code){
    patch.stdin.end();
  });

  patch.stderr.on("data", function(data){
    console.error("PATCH ERROR", data.toString());
  });
  patch.stdout.on("data", function(data){
    console.log("PATCH LOG", data);
  });
};

var input = "";
process.stdin.on('end', function() {
  input = input.split(/\n| /);
  var oldSha = input[0];
  var newSha = input[1];
  var gitnsyncRef = input[2]

  if (gitnsyncRef !== "refs/__git-n-sync__/head"){
    // console.log("not a __git_n_sync__ commit, bailing");
    return;
  }
  // console.log("OLD SHA", oldSha);
  // console.log("NEW SHA", newSha);

  exec("git show -s --format=\"%b\" " + newSha, function(err, stdout, stderr){
    if(err){
      console.error(err);
      process.exit(err.code);
    } else {
      var data = stdout.split(" ");
      //better name for ref
      var ref = data[0], sha = data[1].split("\n")[0];
      // console.log("SERVER REF", ref);
      // console.log("SERVER SHA", sha);
      if (!isHeadCurrent(ref, sha)){
        // console.log("HEAD IS NOT CURRENT");
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
            applyDiff(sha.split("\n")[0], newSha);
          }
        });
      } else {
        applyDiff(oldSha, newSha);
      }
    }
  })
});


