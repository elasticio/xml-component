'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));

const path = require('path');
const xml2Json = require('../xml2Json.js');
const fs = require('fs');


function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunks.push);
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

module.exports.process = async function processAction(msg, cfg) {
    let xml = {};

    console.log('attachment to string started, message=%j cfg=%j', msg, cfg);

    const attachments = msg.attachments;

    console.log('Found %s attachments', Object.keys(attachments || {}).length);
    for (let key in attachments || {}) {
        const attachment = attachments[key];
        const fileName = key;
        console.log('Processing attachment=%s content=%j', fileName, attachment);

        if (fileName.split('.').pop() === 'xml') {

            const requestOptions = {
                url: attachment.url,
                method: 'get',
                json: true,
                body: '',
                headers: ''
            };

            const response = await request(requestOptions);

            if (response.statusCode >= 400) {
                // eslint-disable-next-line max-len
                throw new Error(`Error in making request to ${requestOptions.url} 
                  Status code: ${response.statusCode}, 
                  Body: ${JSON.stringify(response.body)}`);
            }

            const message = {
                body: {
                    xmlString: response.body
                }
            };

            return xml2Json.process(message);

        } else {
            const message = 'Attachment was not xml file make sure file extension is xml.';
            throw new Error('fileName  is incorrect: ' + key + '. ' + message);
        }
    }
    throw new Error('Error attachmentToJson: No XML file found in attachments given. Attachments: '
      + attachments);
};
