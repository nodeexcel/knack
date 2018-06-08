var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var express = require('express')
var router = express.Router()
var multer = require('multer')
var upload = multer()
var multiparty = require('multiparty');
var https = require('https');
var fs = require('fs');
var _ = require('lodash')
var config = require('../config.json');

router.post('/', function(req, res) {
    let attachments = []
    let deleteFiles = req.body.attachments;
    // console.log(deleteFiles, "================")
    getAttachments(req.body, attachments, function(attach) {
        console.log(attach,"===================================")
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
            attachments: attach,
            cc: req.body.cc
        }, (error, response) => {
            console.log(deleteFiles)
            if (deleteFiles.length != 0) {
                _.forEach(deleteFiles, (val, key) => {
                    // console.log(val, "kkkkkkkkkkkkkkkkkkkkkkkkkkkk")
                    fs.unlink(val.name, function(err) {
                        if (err) {
                            console.log(err)
                        }
                    });
                })
            }
            if (error) {
                res.json({ message: "message not sent successfully", status: 0, error: error });
            } else {
                res.json({ message: "messsage sent successfully", status: 1, email_response: response, subject: req.body.subject, body: req.body.html });
            }

            mailer.close();
        });
    })

    function getAttachments(body, attachments, callback) {
        console.log("length")
        if (body.attachments.length != 0) {
            let invoice = body.attachments.splice(0, 1)[0];
            var file = fs.createWriteStream(invoice.name);
            var request = https.get(invoice.fileLink, function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    attachments.push(file)
                    if (body.attachments.length) {
                        getAttachments(body, attachments, callback)
                    } else {
                        callback(attachments)
                    }
                });

            })
        } else {
            callback(attachments)
        }
    }
})

module.exports = router