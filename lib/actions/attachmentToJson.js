const sizeof = require('object-sizeof');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');

const xml2Json = require('../xml2Json.js');

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
        console.log('%s is not .xml file: ', fileName);
        return false;
    }

    return true;
}

module.exports.process = async function processAction(msg, cfg) {
    const { attachments } = msg;
    const pattern = new RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)');
    let foundXML = false;

    console.log('Attachment to XML started');
    console.log('Found %s attachments', Object.keys(attachments || {}).length);

    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(attachments)) {
        const attachment = attachments[key];
        const fileName = key;
        let fileSize = attachment.size; // get file size based attachment object may not be define or be accurate
        console.log('Processing attachment=%s', fileName);

        if (checkFileName(fileName, pattern)) {
            if (fileSize === undefined || fileSize < MAX_FILE_SIZE) {
                // eslint-disable-next-line no-await-in-loop
                const response = await new AttachmentProcessor().getAttachment(attachment.url, 'arraybuffer');

                if (response.status >= 400) {
                    throw new Error(`Error in making request to ${attachment.url}
                                      Status code: ${response.status}, 
                                      Body: ${Buffer.from(response.data, 'binary').toString('base64')}`);
                }

                const responseBodyString = Buffer.from(response.data, 'binary').toString('utf-8');
                fileSize = sizeof(responseBodyString);

                if (fileSize < MAX_FILE_SIZE) {
                    // eslint-disable-next-line no-await-in-loop
                    const returnMsg = await xml2Json.process(responseBodyString);
                    this.emit('data', messages.newMessageWithBody(returnMsg.body));
                    foundXML = true;
                } else {
                    throw new Error(`Attachment ${key} is too large to be processed my XML component.`
                      + ` File limit is: ${MAX_FILE_SIZE} byte, file given was: ${fileSize} byte.`);
                }
            } else {
                throw new Error(`Attachment ${key} is too large to be processed my XML component.`
                  + ` File limit is: ${MAX_FILE_SIZE} byte, file given was: ${fileSize} byte.`);
            }
        }
    }
    if (!foundXML) {
        console.log(`No XML files that match the pattern found with in attachments. Pattern: ${pattern}`);
    }
};
