/* eslint-disable no-await-in-loop */
const { wrapper, AttachmentProcessor } = require('@blendededge/ferryman-extensions');
const sizeof = require('object-sizeof');

const xml2Json = require('../xml2Json');

// eslint-disable-next-line max-len
const MAX_FILE_SIZE = process.env.MAX_XML_FILE_SIZE ? parseInt(process.env.XML_MAX_FILE_SIZE, 10) : 52428800; // 50 MB

function checkFileName(self, fileName, pattern) {
  if (fileName === undefined) {
    return false;
  }

  if (pattern && !pattern.test(fileName)) {
    self.logger.debug('Filename does not match pattern');
    return false;
  }

  if (pattern) {
    return true;
  }

  if (fileName.split('.').pop() !== 'xml') {
    self.logger.debug('Provided fileName is not .xml file');
    return false;
  }

  return true;
}

// eslint-disable-next-line max-len, no-unused-vars
module.exports.process = async function processAction(msg, cfg, snapshot, headers, tokenData = {}) {
  let self;
  try {
    self = await wrapper(this, msg, cfg, snapshot, headers, tokenData);
    const TOKEN = cfg.token ? cfg.token : tokenData.apiKey;
    const { attachments } = msg;
    const pattern = new RegExp(cfg !== undefined ? cfg.pattern || '(.xml)' : '(.xml)');
    let foundXML = false;

    self.logger.info('Attachment to XML started');
    self.logger.info('Found %s attachments', Object.keys(attachments || {}).length);

    const maxFileSize = cfg.maxFileSize ? cfg.maxFileSize : MAX_FILE_SIZE;

    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(attachments)) {
      const attachment = attachments[key];
      const fileName = key;
      // get file size based attachment object may not be define or be accurate
      let fileSize = attachment.size;
      self.logger.info('Processing attachment');

      if (checkFileName(self, fileName, pattern)) {
        if (fileSize === undefined || fileSize < maxFileSize) {
          // eslint-disable-next-line no-await-in-loop
          const response = await new AttachmentProcessor(self, TOKEN, cfg.attachmentServiceUrl).getAttachment(attachment.url, 'arraybuffer');

          self.logger.debug(`For provided filename response status: ${response.status}`);

          self.logger.debug('the response is ', response);

          if (response.status >= 400) {
            throw new Error(`Error in making request to ${attachment.url}
                                        Status code: ${response.status},
                                        Body: ${Buffer.from(response.data, 'binary').toString('base64')}`);
          }

          const responseBodyString = Buffer.from(response.data, 'binary').toString('utf-8');

          if (!responseBodyString) {
            throw new Error(`Empty attachment received for file ${fileName}`);
          }

          fileSize = sizeof(responseBodyString);
          if (fileSize < maxFileSize && cfg.splitResult) {
            await xml2Json.process(self, responseBodyString, cfg);
            self.logger.debug('Attachment to XML finished');
            foundXML = true;
          } else if (fileSize < maxFileSize) {
            await xml2Json.process(self, responseBodyString, cfg);
            self.logger.debug('Attachment to XML finished');
            foundXML = true;
          } else {
            throw new Error(`Attachment ${key} is too large to be processed my XML component.`
              + ` File limit is: ${maxFileSize} byte, file given was: ${fileSize} byte.`);
          }
        } else {
          throw new Error(`Attachment ${key} is too large to be processed my XML component.`
            + ` File limit is: ${maxFileSize} byte, file given was: ${fileSize} byte.`);
        }
      }
    }
    if (!foundXML) {
      self.logger.info('No XML files that match the pattern found within attachments');
    }
    self.emit('end');
  } catch (e) {
    if (self) {
      self.logger.error('Error occurred while processing attachment to XML: ', JSON.stringify(e));
      self.emit('error', e);
    } else {
      this.logger.error('Error occurred while processing attachment to XML attachmentToJson: ', JSON.stringify(e));
      this.emit('error', e);
    }
  }
};
