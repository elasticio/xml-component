/* eslint-disable no-await-in-loop */
const sizeof = require('object-sizeof');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');

const xml2Json = require('../xml2Json.js');

const MAX_FILE_SIZE = 5242880; // 5 MiB

function checkFileName(self, fileName, pattern) {
  if (fileName === undefined) {
    return false;
  }

  if (!pattern.test(fileName)) {
    self.logger.debug('%s does not match pattern: \'%s\'', fileName, pattern);
    return false;
  }

  if (fileName.split('.').pop() !== 'xml') {
    self.logger.debug('%s is not .xml file: ', fileName);
    return false;
  }

  return true;
}

module.exports.process = async function processAction(msg, cfg) {
  const self = this;
  const { attachments } = msg;
  const pattern = new RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)');
  let foundXML = false;

  self.logger.info('Attachment to XML started');
  self.logger.info('Found %s attachments', Object.keys(attachments || {}).length);

  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(attachments)) {
    const attachment = attachments[key];
    const fileName = key;
    // get file size based attachment object may not be define or be accurate
    let fileSize = attachment.size;
    self.logger.info('Processing attachment=%s', fileName);

    if (checkFileName(self, fileName, pattern)) {
      if (fileSize === undefined || fileSize < MAX_FILE_SIZE) {
        // eslint-disable-next-line no-await-in-loop
        const response = await new AttachmentProcessor().getAttachment(attachment.url, 'arraybuffer');

        this.logger.debug(`For filename ${fileName} Response status: ${response.status} Response headers: ${response.headers}`);

        if (response.status >= 400) {
          throw new Error(`Error in making request to ${attachment.url}
                                      Status code: ${response.status},
                                      Body: ${Buffer.from(response.data, 'binary').toString('base64')}`);
        }

        const responseBodyString = Buffer.from(response.data, 'binary').toString('utf-8');
        this.logger.debug(`For filename ${fileName} Response Body string: ${responseBodyString}`);
        fileSize = sizeof(responseBodyString);

        if (fileSize < MAX_FILE_SIZE) {
          const returnMsg = await xml2Json.process(this, responseBodyString);
          this.logger.debug(`For filename ${fileName} Result of XML Conversion: ${returnMsg}`);
          foundXML = true;
          await self.emit('data', messages.newMessageWithBody(returnMsg.body));
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
    self.logger.info(`No XML files that match the pattern found with in attachments. Pattern: ${pattern}`);
  }
};
