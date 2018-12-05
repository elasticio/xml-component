'use strict';

const messages = require('elasticio-node').messages;
const xml2js = require('xml2js');

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
