const { wrapper, AttachmentProcessor } = require('@blendededge/ferryman-extensions');
const xml2js = require('xml2js');
const _ = require('lodash');
const messages = require('../messages');

const MB_TO_BYTES = 1024 * 1024;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

// eslint-disable-next-line no-unused-vars
module.exports.process = async function process(msg, cfg, snapshot = {}, headers, tokenData = {}) {
  const wrapped = wrapper(this, msg, cfg, {});
  const TOKEN = cfg.token ? cfg.token : tokenData.apiKey;
  const { input } = msg.data;
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
    await wrapped.emit('data', messages.newMessage({
      xmlString,
    }));
    return;
  }

  const attachmentSize = Buffer.byteLength(xmlString);
  if (attachmentSize > MAX_FILE_SIZE) {
    throw new Error(`XML data is ${attachmentSize} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
  }
  this.logger.info(`Will create XML attachment of size ${attachmentSize} byte(s)`);

  const attachmentProcessor = new AttachmentProcessor(wrapped, TOKEN, cfg.attachmentServiceUrl);
  const uploadResult = await attachmentProcessor.uploadAttachment(xmlString, 'application/xml');
  const attachmentUrl = uploadResult.config.url;
  this.logger.info('Attachment created successfully');

  const outboundMessage = messages.newMessage();
  outboundMessage.attachments = {
    'jsonToXml.xml': {
      url: attachmentUrl,
      size: attachmentSize,
    },
  };
  outboundMessage.data = {
    attachmentUrl,
    attachmentSize,
  };
  await wrapped.emit('data', outboundMessage);
};
