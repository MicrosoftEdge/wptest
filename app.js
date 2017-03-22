var fs = require('fs')
var express = require('express')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

// init the app
var package = JSON.parse(fs.readFileSync('package.json'));
var app = express();

// settings 
// IMPORTANT: use either environment variables or hidden app.config.js to override
// IMPROTANT: any non-default value should never be commited as part of this file
var CFG = {
	// used when a global url is required
	CURRENT_HOST: 'http://localhost:3000',
	// used to connect to the mongo database, you need to start a local one by default
	MONGO_URL: 'mongodb://localhost:27017/wptest',
	// how long a user stays logged in by default
	LOGIN_MAX_AGE: 1000*36e00*24*31*6,
	// used to sign login cookies, don't choose too short
	COOKIE_SECRET: 'UNSECURE_DEFAULT_SECRET',
	// default requires http://localhost:3000/ (get your own at https://github.com/settings/applications/new)
	GITHUB_CLIENT_ID: '63cc96eaf4ce8b5e9c42',
	// see above, remember that you want to change these settings 
	GITHUB_CLIENT_SECRET: 'abc8563f29d336c7da691e2d5c27af0d01d1fcde',
}
if(process && process.env) {
	for(var key in CFG) {
		if(CFG.hasOwnProperty(key) && process.env[key]) {
			CFG[key] = process.env[key];
		}
	}
}
if(fs.existsSync("./app.config.js")) {
	Object.assign(CFG, require('./app.config.js'));
}

// detect if we are in test mode
// test mode is designed to boot, connect to the database, then exit in less than 30s
var isTestModeEnabled = !process.argv.every(arg => arg != '--test');
if(isTestModeEnabled) {
	setTimeout(action => console.log('Test took too long') || process.exit(1), 30000);
}

// connect to mongodb
var db = null, tests = null, authors = null;
require('mongodb').connect(CFG.MONGO_URL, function (err, new_db) {

	// ensure success
	if(err || !new_db) throw err;

	// get references to the collections we use
	var new_tests = new_db.collection('tests');
	var new_authors = new_db.collection('authors');

	// verrify that the schema is ready
	new_tests.ensureIndex('id', { unique: true })
	new_tests.ensureIndex('author', { unique: false })
	new_tests.ensureIndex('creationDate');
	new_tests.ensureIndex({ title:"text", html:"text", css:"text", jsHead:"text", jsBody:"text" });
	new_authors.ensureIndex('username', { unique: true });
	new_authors.ensureIndex('email', { unique: true });

	// make the collections available for use in the server
	db = new_db;
	tests = new_tests;
	authors = new_authors;

	// in test mode this is sufficient
	if(isTestModeEnabled) {
		setTimeout(action => console.log('Test succeeded') || process.exit(0), 1000);
	}

});

// enable signed cookies
app.use(cookieParser(CFG.COOKIE_SECRET));

// enable github authentification
passport.serializeUser((user, setCookie) => setCookie(null, JSON.stringify(user)));
passport.deserializeUser((cookie, setUser) => setUser(null, JSON.parse(cookie)));
passport.use('github', new GitHubStrategy(
	{
		clientID: CFG.GITHUB_CLIENT_ID,
		clientSecret:  CFG.GITHUB_CLIENT_SECRET,
		callbackURL: CFG.CURRENT_HOST + '/login/github/end',
		passReqToCallback: true, // req object on auth is passed as first arg
		scope: [ 'user:email' ], // fetches non-public emails as well
	},
	function (req, accessToken, refreshToken, profile, done) {

		// get the user's email address
		var email = profile._json.email;
		if(!email) {
			var emails = profile.emails.filter(a => a.verified);
			if(emails.length) email = emails[0].value;
		}

		// create the user profile
		var user = {
			id: profile.id,
			username: profile.username,
			email: email
		};

		// update the database
		authors.update({ id: user.id }, user, { upsert: true }, then => done(null, user));
	}
));

// setup authentification urls
app.use(session({ secret: CFG.COOKIE_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.get('/login/github/start', passport.authenticate('github'));
app.get('/login/github/end', passport.authenticate('github', { failureRedirect: '/login/error' }), function(req, res) {
	res.cookie('user', JSON.stringify(req.user), { signed: true, maxAge: CFG.LOGIN_MAX_AGE })
	res.redirect('/#/local:save');
});

function getConnectedUser(req) {
	var user = req.signedCookies['user'];
	user = user ? JSON.parse(user) : null;
	return user;
}

// setup debug routes
app.get('/package/name', (req, res) => { res.send(package.name); });
app.get('/package/version', (req, res) => { res.send(package.version); });
app.get('/package/description', (req, res) => { res.send(package.description); });

// setup test short urls
app.get("/:testId([a-z0-9]*[0-9])", (req, res) => { res.redirect("/#/" + req.params.testId); });

// setup test data urls
app.get("/uploads/:testId([a-z0-9]*[0-9]).json", (req, res) => {
	try {

		var id = req.params.testId; console.log(req.params);
		tests.find({ id: id }).toArray(function (err, results) {
			if (err || results.length == 0) {
				res.status(404).send("Test not found");
			} else {
				res.status(200).send(JSON.stringify(results[0]));
			}
		});

	} catch (ex) {

		console.log(ex.message);
		res.status(500).send("Database error");

	}
});

// setup shortcut for your user page
app.get('/u/', (req, res) => {
	var user = getConnectedUser(req);
	if(user) {
		res.vary('Cookie').redirect(307, "/u/" + user.username + "/");
	} else {
		res.vary('Cookie').redirect(307, "/login/github/start");
	}
});

// setup list-of-testcases by user url
app.get('/u/:username/', (req, res) => {
	tests.find({ author: req.params.username }).toArray(function (err, results) {
		if(err || results.length == 0) {
			res.status(404).send("Tests not found");
		} else {
			res.status(200).send(results.map(r => `<a href="/#/${r.id}">${r.id}: ${r.title} (${new Date(r.creationDate)})</a><br/>`).join(''))
		}
	})
})

// setup search url
app.get('/search', (req, res) => {
	var q = ` ${req.query['q']} `;
	var qSegments = q.split(/ --([a-z]+) /g);
	var qBeforeFlags = qSegments[0];
	var qTitle = [], qHtml = [], qCss = [], qJs = [];
	for(var i = 1; i<qSegments.length; i+=2) {
		switch(qSegments[i]) {
			case 'title': qTitle = qSegments[i+1].trim().split(/\s+/); break;
			case 'html': qHtml = qSegments[i+1].trim().split(/\s+/); break;
			case 'css': qCss = qSegments[i+1].trim().split(/\s+/); break;
			case 'js': qJs = qSegments[i+1].trim().split(/\s+/); break;
			default: throw "INVALID INSTRUCTION: " + qSegments[i];
		}
	}
	var searchText = (qBeforeFlags + ' ' + qTitle + ' ' + qHtml + ' ' + qCss + ' ' + qJs).trim();
	console.log(searchText);
	tests.find({ "$text": { "$search": searchText } }).toArray(function(err,results) {
		var results = results.filter(r => {
			if(qTitle.length && qTitle.every(qTitle => !~r.title.toLowerCase().indexOf(qTitle.toLowerCase()))) return false;
			if(qHtml.length && !~r.html.toLowerCase().indexOf(qHtml.toLowerCase())) return false;
			if(qCss.length && !~r.css.toLowerCase().indexOf(qCss.toLowerCase())) return false;
			if(qJs.length && !~r.jsBody.toLowerCase().indexOf(qJs.toLowerCase())) return false;
			return true;
		});
		if(results.length) {
			var html = results.map(r => `<a href="/#/${r.id}">${r.id}: ${r.title} (${new Date(r.creationDate)})</a><br/>`).join('')
			res.status(200).send(html);
		} else {
			res.status(200).send("No result found")
		}
	})
});

// enable support for post requests
app.use(function (req, res, next) {
	if (req.method == 'POST') {
		req.text = '';
		req.setEncoding('utf8');
		req.on('data', function (chunk) { req.text += chunk });
		req.on('end', next);
	} else {
		next();
	}
});

// setup testcase upload url
app.post('/new/testcase', (req, res) => {
	
	// check authentication
	var author = getConnectedUser(req);
	if(!author) {
		res.status(401).send("Only connected users are allowed to save tests");
		return;
	}

	// extend the validity of the login cookie
	res.cookie('user', JSON.stringify(author), { signed: true, maxAge: CFG.LOGIN_MAX_AGE })

	// check posted content is not empty
	if (!req.text) {
		res.status(400).send("BadRequest");
		return;
	}

	// parse the request
	var test = null;
	try {

		// checks that the data themselves are not too big
		if(req.text.length > 10000) throw "TEST TOO LONG";

		// parse and sanitize the test case
		test = JSON.parse(req.text);
		test = {
			id: "new",
			author: author.username,
			creationDate: Date.now(),
			title: String(test.title),
			html: String(test.html),
			css: String(test.css),
			jsBody: String(test.jsBody),
			jsHead: String(test.jsHead),
			watches: test.watches.map(expr => String(expr))
		}

		console.log(test);

	} catch (ex) {

		res.status(400).send("BadRequest");
		return;

	}

	// insert the test in the database
	assignUniqueId().then(test => tests.insertOne(test)).then(
		onsuccess => { res.status(200).send(JSON.stringify({ id: test.id })); },
		onerror   => { res.status(500).send("Database error"); }
	);

	// ================================================================

	function generateNewId() {
		var id = '';
		var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
		var idDigits = '0123456789';
		for (var i = 5; i--;) {
			id += idLetters[Math.floor(Math.random() * idLetters.length)];
		}
		id += idDigits[Math.floor(Math.random() * idDigits.length)]
		return id;
	}

	function assignUniqueId() {
		// TODO: if test.id is already specified, we should reuse the root and find the next valid id
		return new Promise(resolve => {
			test.id = generateNewId();
			tests.find({ id: test.id }).toArray().then(conflicts => {
				if(conflicts.length == 0) {
					resolve(test);
				} else {
					resolve(assignUniqueId());
				}
			});
		});
	}

});

// serve the website content for all other urls
app.use(express.static('wwwroot'))

// start the server
app.listen(process.env.port || 3000, function () {
	console.log('Web Platform Test Center listening on port '+(process.env.port || 3000)+'!')
})