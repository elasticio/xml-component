'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));
const sizeof = require('object-sizeof');

const xml2Json = require('../xml2Json.js');
const messages = require('elasticio-node').messages;

const MAX_FILE_SIZE = 5242880; // 5 MiB


function checkFileName(fileName, pattern) {

    if (fileName === undefined) {
        return false;
    }

    if (!pattern.test(fileName)) {
        console.log('%s does not match pattern: \'%s\'', fileName, pattern);
        return false;
    }

    if (fileName.split('.').pop() !== 'xml') {
        console.log('%s is not xml: ', fileName);
        return false;
    }

    return true;
}

module.exports.process = async function processAction(msg, cfg) {
    const attachments = msg.attachments;
    const pattern = new RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)');
    let foundXML = false;

    console.log('Attachment to XML started');
    console.log('Found %s attachments', Object.keys(attachments || {}).length);

    for (let key in attachments) {
        const attachment = attachments[key];
        const fileName = key;
        let fileSize = attachment.size; //get file size based attachment object may not be define or be accurate
        console.log('Processing attachment=%s', fileName);

        if (checkFileName(fileName, pattern)) {
            if (fileSize === undefined || fileSize < MAX_FILE_SIZE) {
                const requestOptions = {
                    url: attachment.url,
                    method: 'get',
                    json: true
                };

                const response = await request(requestOptions);

                if (response.statusCode >= 400) {
                    throw new Error(`Error in making request to ${requestOptions.url} 
              Status code: ${response.statusCode}, 
              Body: ${JSON.stringify(response.body)}`);
                }
                fileSize = sizeof(response.body);

                if (fileSize < MAX_FILE_SIZE) {
                    const returnMsg = await xml2Json.process(response.body);
                    this.emit('data', messages.newMessageWithBody(returnMsg.body));
                    foundXML = true;
                } else {
                    throw new Error(`Attachment ${key} is to large to be processed my XML component.`
                      + `File limit is : ${MAX_FILE_SIZE}, file given was: ${fileSize}`);
                }

            } else {
                throw new Error('Attachment ' + key + ' is to large to be processed my XML component.'
                  + ' File limit is: ' + MAX_FILE_SIZE + ', file given was: ' + fileSize + '.');
            }
        }
    }
    if (!foundXML) {
        console.log(`No XML files that match the pattern found with in attachments. Pattern: ${pattern}`);
    }
};
