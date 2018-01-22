var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var express = require('express')
var router = express.Router()
var multer  = require('multer')
var upload = multer()
var multiparty = require('multiparty');

router.post('/',function (req, res) {
    console.log("payload",req.body)
getEncodedPDF(function (req.body.pdf) {
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="filename.pdf"'
    });
    let mailer = nodemailer.createTransport(smtpTransport({
        host: req.body.smtp_server,
        port: parseInt(req.body.server_port),
        auth: {
            user: req.body.username,
            pass: req.body.password
        }
    }));
    mailer.sendMail({
        from: req.body.from,
        to: req.body.to,
        subject: req.body.subject,
        html: req.body.html,
        attachments: [{
                    filename: req.body.filename,
                    content: req.body.content
                }]
    }, (error, response) => {
        if (error) {
            res.json({message:"message not sent successfully",status:0,error:error});
        } else {
            res.json({ message: "messsage sent successfully", status: 1, email_response: response, subject: req.body.subject, body: req.body.html });
        }
        mailer.close();
    });
})

module.exports = router