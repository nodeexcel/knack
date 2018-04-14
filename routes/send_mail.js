var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var express = require('express')
var router = express.Router()
var multer = require('multer')
var upload = multer()
var multiparty = require('multiparty');
var fs = require('fs');
var config = require('../config.json');

router.post('/', function(req, res) {
    let attachments = []
    if (req.body.filename) {
        let attachment = {
            "filename": req.body.filename,
            "content": new Buffer(req.body.pdf, 'base64')
        }
        attachments.push(attachment)
    }
    let mailer = nodemailer.createTransport(smtpTransport({
        host: 'smtp.sendgrid.net',
        port: 465,
        auth: {
            user: 'apikey',
            pass: config.sendgrid_token
        }
    }));
    mailer.sendMail({
        from: req.body.from,
        to: req.body.to,
        subject: req.body.subject,
        html: req.body.html,
        attachments: attachments,
        cc: req.body.cc
    }, (error, response) => {
        if (error) {
            res.json({ message: "message not sent successfully", status: 0, error: error });
        } else {
            res.json({ message: "messsage sent successfully", status: 1, email_response: response, subject: req.body.subject, body: req.body.html });
        }
        mailer.close();
    });
})

module.exports = router