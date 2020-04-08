const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');
const xml2js = require('xml2js');
const _ = require('lodash');

const MB_TO_BYTES = 1024 * 1024;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

module.exports.process = async function process(msg, cfg) {
  const { input } = msg.body;
  const { uploadToAttachment, excludeXmlHeader, headerStandalone } = cfg;

  this.logger.info('Message received.');

  const options = {
    trim: false,
    normalize: false,
    explicitArray: false,
    normalizeTags: false,
    attrkey: '_attr',
    explicitRoot: false,
    xmldec: {
      standalone: headerStandalone,
      encoding: 'UTF-8',
    },
    headless: excludeXmlHeader,
  };
  const builder = new xml2js.Builder(options);

  // Check to make sure that input has at most one key
  // https://github.com/Leonidas-from-XIV/node-xml2js/issues/564
  if (!_.isPlainObject(input) || Object.keys(input).length !== 1) {
    throw new Error('Input must be an object with exactly one key.');
  }

  const xmlString = builder.buildObject(input);

  if (!uploadToAttachment) {
    this.logger.info('Sending XML data in message.');
    await this.emit('data', messages.newMessageWithBody({
      xmlString,
    }));
    return;
  }

  const attachmentSize = Buffer.byteLength(xmlString);
  if (attachmentSize > MAX_FILE_SIZE) {
    throw new Error(`XML data is ${attachmentSize} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
  }
  this.logger.info(`Will create XML attachment of size ${attachmentSize} byte(s)`);

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
