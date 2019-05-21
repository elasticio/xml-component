'use strict';

const messages = require('elasticio-node').messages;
const xml2js = require('xml2js');

function validateXml(xmlString, parser) {
    parser.parseString(xmlString, function (err, result) {
        const message = 'Given XML is not valid or the file can not be read. '
      + 'See xml naming rules https://www.w3schools.com/xml/xml_elements.asp';
        if (err) {
            throw new Error(message);
        }
        console.log('Given XML is valid');
    });
}

module.exports.process = function xml2Json(xmlString) {
    const parser = new xml2js.Parser({
        trim: false,
        normalize: false,
        explicitArray: false,
        normalizeTags: false,
        attrkey: '_attr',
        tagNameProcessors: [
            (name) => name.replace(':', '-')
        ]
    });

    validateXml(xmlString, parser);

    return new Promise((resolve, reject) => {
        parser.parseString(xmlString, function processResult(err, data) {
            if (err) {
                console.log('Error occurred', err.stack || err);
                return reject(err);
            }
            console.log('Successfully converted XML to JSON.');
            return resolve(messages.newMessageWithBody(data));
        });
    });
};
