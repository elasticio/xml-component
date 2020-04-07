const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');
const xml2js = require('xml2js');

const MB_TO_BYTES = 1024 * 1024;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

module.exports.process = async function process(msg, cfg) {
  const { input } = msg.body;
  const { uploadToAttachment, includeXmlHeader, headerStandalone } = cfg;

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
    },
    headless: !includeXmlHeader,
  };
  const builder = new xml2js.Builder(options);

  const xmlString = builder.buildObject(input);

  if (!uploadToAttachment) {
    this.logger.info('Sending XML data in message.');
    await this.emit('data', messages.newMessageWithBody({
      xmlString,
    }));
    return;
  }

  const attachmentSize = Buffer.byteLength(xmlString);
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
