const { messages } = require('elasticio-node');
const xml2js = require('xml2js');

const invalidXmlMessage = 'Given XML is not valid or the file can not be read. '
    + 'See xml naming rules https://www.w3schools.com/xml/xml_elements.asp';

module.exports.process = function xml2Json(xmlString) {
    const parser = new xml2js.Parser({
        trim: false,
        normalize: false,
        explicitArray: false,
        normalizeTags: false,
        attrkey: '_attr',
        tagNameProcessors: [
            (name) => name.replace(':', '-'),
        ],
    });

    return new Promise((resolve, reject) => {
        parser.parseString(xmlString, (err, data) => {
            if (err) {
                console.log('Error occurred', err.stack || err);
                reject(new Error(invalidXmlMessage));
            } else {
                console.log('Successfully converted XML to JSON.');
                resolve(messages.newMessageWithBody(data));
            }
        });
    });
};
