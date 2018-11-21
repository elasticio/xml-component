'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));
const sizeof = require('object-sizeof');

const xml2Json = require('../xml2Json.js');
const messages = require('elasticio-node').messages;

const MAX_FILE_SIZE = 5242880; // 5 MiB


function checkFileName(fileName, cfg) {
    let pattern = new RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)');

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
    let foundXML = false;

    console.log('Attachment to XML started');

    console.log('Found %s attachments', Object.keys(attachments || {}).length);
    for (let key in attachments) {
        const attachment = attachments[key];
        const fileName = key;
        let filesize = attachment.size; //get file size based attachment object may not be define or be accurate
        console.log('Processing attachment=%s', fileName);

        if (checkFileName(fileName, cfg)) {
            if (filesize === undefined || filesize < MAX_FILE_SIZE) {
                const requestOptions = {
                    url: attachment.url,
                    method: 'get',
                    json: true
                };

                const response = await request(requestOptions);

                if (response.statusCode >= 400) {
                // eslint-disable-next-line max-len
                    throw new Error(`Error in making request to ${requestOptions.url} 
              Status code: ${response.statusCode}, 
              Body: ${JSON.stringify(response.body)}`);
                }
                filesize = sizeof(response.body);

                if (filesize < MAX_FILE_SIZE) {
                    console.log('Emitting message' + response.body);
                    let returnMsg = messages.newEmptyMessage;

                    returnMsg = await xml2Json.process(response.body);
                    this.emit('data', returnMsg);
                    console.log('message emit' + returnMsg);
                    foundXML = true;
                } else {
                    throw new Error('XML is to large of file: ' + key
                  + '.Attachment was to large to be processed my XML component.'
                  + 'File limit is :' + MAX_FILE_SIZE + 'file given was:' + filesize);
                }

            } else {
                throw new Error('Attachment is to large: ' + key
                + '.Attachment was to large to be processed my XML component.'
                + 'File limit is :' + MAX_FILE_SIZE + 'file given was:' + filesize);
            }

        }
    }
    if (!foundXML) {
        throw new Error('No XML files that match the patter found with in attachments. Patter: %s',
          RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)'));
    }
};
