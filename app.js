var fs = require('fs')
var package = JSON.parse(fs.readFileSync('package.json'));
var express = require('express')
var app = express()

// detect the home folder
var uploadsFolder = fs.existsSync("d:\\home") ? "d:\\home\\wptest_uploads\\" : __dirname + "/uploads/";
if(!fs.existsSync(uploadsFolder)) { fs.mkdirSync(uploadsFolder); }

app.get('/package/name', function(req, res) { res.send(package.name); });
app.get('/package/version', function(req, res) { res.send(package.version); });
app.get('/package/description', function(req, res) { res.send(package.description); });

function generateNewId() {
    var id = '';
    var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var idDigits = '0123456789';
    for(var i = 5; i--;) {
      id += idLetters[Math.floor(Math.random() * idLetters.length)];
    }
    id += idDigits[Math.floor(Math.random() * idDigits.length)]
    return id;
}

app.get("/[a-z0-9]*[0-9]", function(req, res) {
  res.redirect("/#" + req.path.substr(1));
});

app.get("/uploads/[a-z0-9]*[0-9].json", function(req, res) {
  res.sendFile(uploadsFolder + req.path.substr("/uploads/".length));
});

app.use(function(req, res, next){
  if (req.method == 'POST') {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){ req.text += chunk });
    req.on('end', next);
  } else {
    next();
  }
});

app.post('/new/testcase', function(req, res) {
  if(req.text) {

    // find a valid id
    var id = '', filepath = '';
    do {
      id = generateNewId();
      filepath = uploadsFolder + id + '.json';
    } while(fs.existsSync(filepath));

    // write the test case to it
    fs.writeFile(filepath, req.text, x => { 
      
      // output the id of th test case
      res.status(200).send(JSON.stringify({id:id}));

    });

  } else {

    // don't accept get requests or empty files
    res.status(400).send("BadRequest");

  }
});

app.use(express.static('wwwroot'))
app.use('/uploads', express.static(uploadsFolder))
app.listen(process.env.port || 3000, function () {
  console.log('Example app listening on port 3000!')
})