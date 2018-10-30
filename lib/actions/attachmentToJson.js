'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));
const sizeof = require('object-sizeof');

const xml2Json = require('../xml2Json.js');

const maxfileszie = 5000000; // 5MB

module.exports.process = async function processAction(msg, cfg) {

    console.log('Attachment to string started, message=%j cfg=%j', msg, cfg);

    const attachments = msg.attachments;

    console.log('Found %s attachments', Object.keys(attachments || {}).length);
    for (let key in attachments || {}) {
        const attachment = attachments[key];
        const fileName = key;
        let filesize = attachment.size; //get file size based attachment object may not be define or be accurate
        console.log('Processing attachment=%s content=%j', fileName, attachment);

        if (fileName.split('.').pop() !== 'xml') {
            console.log('Attachment' + key + ' is not xml');
            break;
        }

        if (filesize !== undefined && filesize > maxfileszie) {
            console.log('Attachment is to large: ' + key + '.Attachment was to large to be processed my XML component.'
            + 'File limit is :' + maxfileszie + 'file given was:' + filesize);
            return;
        }

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

        if (filesize !== undefined && filesize > maxfileszie) {
            console.log('XML is to large of file: ' + key + '.Attachment was to large to be processed my XML component.'
            + 'File limit is :' + maxfileszie + 'file given was:' + filesize);
            return;
        }
        return xml2Json.process(response.body);

    }
    //throw new Error('Error attachmentToJson: No XML file found in attachments given. Attachments: '
    //  + attachments);
};
