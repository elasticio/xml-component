const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');
const xml2js = require('xml-js');

const MB_TO_BYTES = 1024 * 1024;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

module.exports.process = async function processAction(msg, cfg) {
  const { input } = msg;
  const { uploadToAttachment } = cfg;

  this.logger.info('Message received.');

  const xmlString = xml2js.js2xml(input, {
    compact: true,
    attributesKey: '_attr',
  });

  if (!uploadToAttachment) {
    this.logger.info('Sending XML data in message.');
    await this.emit('data', messages.newMessageWithBody({
      xmlString,
    }));
    return;
  }

  const attachmentSize = Buffer.byteLength(input);
  this.logger.info(`Will create XML attachment of size ${attachmentSize} byte(s)`);
  if (attachmentSize > MAX_FILE_SIZE) {
    throw new Error(`XML data is ${attachmentSize} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
  }

  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(xmlString);
  const attachmentUrl = uploadResult.config.url;
  this.logger.info(`Successfully created attachment at ${attachmentUrl}`);

  const outboundMessage = messages.newEmptyMessage();
  outboundMessage.attachments = {
    'jsonToXml.xml': {
      url: attachmentUrl,
      size: attachmentSize,
    },
  };
  outboundMessage.body = {
    attachmentUrl,
    attachmentSize,
  };
  await this.emit('data', outboundMessage);
};
