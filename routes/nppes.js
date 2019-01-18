const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlstojson = require("xls-to-json");
const xlsxtojson = require("xlsx-to-json");
const fs = require('fs');
const request = require('request');
const XLSX = require('xlsx');
const path = require('path');

/* Providing storage location for uploaded file */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + '/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + file.originalname + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.post('/updatefiles', upload.array("uploadfiles", 12), async (req, res) => {

    /* Multer gives us files info in req.files object */
    if (!req.files.length ) {
        res.status(400).json({ error_code: 1, err_desc: "No files passed" });
        return;
    }
    /* Check the extension of the incoming files to use appropriate module */
    if (req.files.length == 2) {
        if (path.extname(req.files[0].originalname) && path.extname(req.files[1].originalname) === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
    } else {
        if (path.extname(req.files[0].originalname) === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
    }

    try {
        //function to convert excel files to json
        async function sheetsToJson(req) {

            let firstFiles = [];
            let secondFiles = [];
            await req.files.forEach(async (file, index) => {
                await exceltojson({
                    input: file.path,
                    output: null
                }, async function (err, result) {
                    if (err) {
                        return res.json({ error_code: 1, err_desc: err, jsonBody: null });
                    }
                    result = JSON.parse(JSON.stringify(result));
                    if (result[0].NPI) {
                        secondFiles = result;
                    } else {
                        firstFiles = result;
                    }
                    let allData = [];
                    if (req.files.length == 2) {
                        if (index === 1) {
                            if(!secondFiles[0]){
                                res.status(400).json({ error_code: 1, err_desc: 'file is not right' })
                            }else{
                                dataHandler(firstFiles, secondFiles, req, allData, async (finalData) => {
                                    await jsonToExcel(finalData, req)
                                    // console.log('merge file has created')
                                    res.redirect(`/upload?filepath=${'mergesheetjs.xlsx'}`)
                                    /* Removing files from uploads folder */
                                    fs.readdir('./uploads', (err, files) => {
                                        if (err) throw err;
                                        for (const file of files) {
                                            fs.unlink(path.join('./uploads', file), err => {
                                                if (err) throw err;
                                            });
                                        }
                                    });
                                })
                            }
                            
                        }
                    } else {
                        if(!secondFiles[0]){
                            res.status(400).json({ error_code: 1, err_desc: 'file is not right' })                            
                        }else{
                            dataHandler(firstFiles, secondFiles, req, allData, async (finalData) => {
                                await jsonToExcel(finalData, req)
                                // console.log('updated file has created')
                                res.redirect(`/upload?filepath=${'updatesheetjs.xlsx'}`)
                                /* Removing files from uploads folder */
                                fs.readdir('./uploads', (err, files) => {
                                    if (err) throw err;
                                    for (const file of files) {
                                        fs.unlink(path.join('./uploads', file), err => {
                                            if (err) throw err;
                                        });
                                    }
                                });
                            })
                        }
                        
                    }
                });
            })
        }
        await sheetsToJson(req)

    } catch (error) {
        res.json({ error_code: 1, err_desc: "Corupted excel files" });
    }


    /* Convert json to sheet */
    function jsonToExcel(data, req) {
        let ws = XLSX.utils.json_to_sheet(data);
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "test");
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        function s2ab(s) {
            let buf = new ArrayBuffer(s.length);
            let view = new Uint8Array(buf);
            for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        if (req.files.length == 2) {
            fs.writeFileSync("./public/mergesheetjs.xlsx", wbout);
            XLSX.writeFile(wb, "./public/mergesheetjs.xlsx");
        } else {
            fs.writeFileSync("./public/updatesheetjs.xlsx", wbout);
            XLSX.writeFile(wb, "./public/updatesheetjs.xlsx");
        }
    }

    async function dataHandler(firstFiles, secondFiles, req, allData, cb) {
        if (secondFiles.length) {
            let firstFile = firstFiles.splice(0, 1)[0];
            let secondFile = secondFiles.splice(0, 1)[0];
            // console.log(secondFile.NPI, '*****************')
            request.get(`https://npiregistry.cms.hhs.gov/api/?number=${secondFile.NPI}`,
                async function (error, response, body) {
                    if (error) {
                        res.status(400).send(error);
                    }
                    if (response.statusCode == 200) {
                        let jsonBody = JSON.parse(body);
                        let taxonomiesResults = jsonBody.results[0].taxonomies;
                        taxonomiesResults.forEach(async (taxonomiesResult, index) => {
                            await Object.keys(taxonomiesResult).forEach(async (taxonomiesKey) => {
                                secondFile['Taxonomies' + index + taxonomiesKey.charAt(0).toUpperCase() + taxonomiesKey.slice(1)] = await taxonomiesResult[taxonomiesKey];
                            })
                        })
                        delete secondFile['TaxonomiesCode']
                        delete secondFile['TaxonomiesPrimary']


                        let basicResult = jsonBody.results[0].basic;
                        await Object.keys(basicResult).forEach(async (basicKey) => {
                            const matchKey = basicKey.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await basicResult[basicKey];
                            }
                        })
                        let mailAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(mailAddress).forEach(async (mailAddressKey) => {
                            const matchKey = 'Mail' + mailAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await mailAddress[mailAddressKey];
                            }
                        })
                        secondFile['COVERED_RECIPIENT_PHYSICIAN_PRIMARY_TYPE'] = jsonBody.results[0].enumeration_type;
                        let locationAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(locationAddress).forEach(async (locationAddressKey) => {
                            const matchKey = 'Loc' + locationAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await locationAddress[locationAddressKey];
                            }
                        })
                        if (req.files.length == 2) {
                            let firstFileKeys = Object.keys(firstFile)
                            let secondFileKeys = Object.keys(secondFile)
                            const idKey = 'Cumulative Recipient Name'
                            if (firstFile[idKey] == secondFile[idKey]) {
                                firstFileKeys.forEach((firstFileKey) => {
                                    secondFileKeys.forEach((secondFileKey) => {
                                        if (firstFileKey == secondFileKey) {
                                            secondFile[firstFileKey] = firstFile[firstFileKey]
                                        }
                                        secondFile[firstFileKey] = firstFile[firstFileKey]
                                    })
                                })
                            }
                        }
                        allData.push(secondFile);
                    }
                    if (secondFiles.length) {
                        await dataHandler(firstFiles, secondFiles, req, allData, cb);
                    } else {
                        cb(allData);
                    }
                });
        } else {
            cb(allData);
        }
    }
})

module.exports = router;