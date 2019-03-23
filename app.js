var path = require('path')
var config = require('./config.json')
var express = require('express')
var session = require('express-session')
var app = express()
var cors = require('cors')
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');
var http = require('http');
var cron = require('./tools/cronjob.js')

global.__basedir = __dirname;

// var routes = require('./routes/auth.js')(app)
var privateKey = fs.readFileSync('./sslprivatekeymarch2019.key', 'utf8');
var certificate = fs.readFileSync('./sslcertificatemarch2019.crt', 'utf8');

var credentials = { key: privateKey, cert: certificate };
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({ secret: 'secret', resave: 'false', saveUninitialized: 'false' }))
app.use(cors());
// Initial view - loads Connect To QuickBooks Button
app.get('/', function (req, res) {
    res.render('home', config)
})

app.get('/upload', function (req, res) {
    res.render('index', { fileName: req.query.filepath || null, error: req.query.error || null })
})

// app.get('/download', function (req, res) {
//     res.render('downloadfile')
// })
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json())
app.use(bodyParser.text({ type: 'text/html' }))
app.use(bodyParser.json({ type: 'application/*+json' }))
cron.updateAccessToken();

// Sign In With Intuit, Connect To QuickBooks, or Get App Now
// These calls will redirect to Intuit's authorization flow
app.use('/sign_in_with_intuit', require('./routes/sign_in_with_intuit.js'))
app.use('/connect_to_quickbooks', require('./routes/connect_to_quickbooks.js'))
app.use('/connect_handler', require('./routes/connect_handler.js'))

app.use('/inventory', require('./routes/inventory.js'))
app.use('/updateInventory', require('./routes/updateInventory.js'))
app.use('/getInventory', require('./routes/getInventory.js'))
app.use('/expenseAccountRef', require('./routes/expenseAccountRef.js'))
app.use('/incomeAccountRef', require('./routes/incomeAccountRef.js'))
app.use('/assetAccountRef', require('./routes/assetAccountRef.js'))
app.use('/purchaseTaxCodeRef', require('./routes/purchaseTaxCodeRef.js'))
app.use('/updateInventoryQuantityAdjustment', require('./routes/updateInventoryQuantityAdjustment.js'))
app.use('/addCustomer', require('./routes/addCustomer.js'))
app.use('/updateCustomer', require('./routes/updateCustomer.js'))
app.use('/addSupplier', require('./routes/addSupplier.js'))
app.use('/updateSupplier', require('./routes/updateSupplier.js'))
app.use('/isAuthenticated', require('./routes/tokenAuthentication.js'))
app.use('/salesRecord', require('./routes/salesRecord.js'))
app.use('/sendMail', require('./routes/send_mail.js'))
app.use('/mailMultipleAttach', require('./routes/mail_multi_attach.js'))
app.use('/nppes', require('./routes/nppes'))
// Callback - called via redirect_uri after authorization
app.use('/callback', require('./routes/callback.js'))

// Connected - call OpenID and render connected view
app.use('/connected', require('./routes/connected.js'))

// Call an example API over OAuth2
app.use('/api_call', require('./routes/api_call.js'))


// Start server on HTTP (will use ngrok for HTTPS forwarding)
let server = https.createServer(credentials, app)
let httpServer = http.createServer(app);
httpServer.listen(9000, function () {
    console.log("Http is listening on port", 9000)
}).timeout = 1000000
server.listen(process.env.PORT || 3000, function() {
    console.log('Example app listening on port', process.env.PORT || 3000)
}).timeout = 1000000