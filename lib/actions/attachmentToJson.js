/* eslint-disable no-await-in-loop, no-restricted-syntax, max-len, no-unused-vars, no-loop-func */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { createSchema } = require('genson-js');
const jsf = require('json-schema-faker');
const sizeof = require('object-sizeof');
const { newMessageWithBody } = require('elasticio-node/lib/messages');
const { readFile, writeFile, stat } = require('fs/promises');
const {
  getUserAgent,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_FOR_SAMPLE,
  memUsage,
} = require('../utils');
const attachmentToJsonIn = require('../schemas/attachmentToJson.in.json');
const xml2Json = require('../xml2Json');

const isDebugFlow = process.env.ELASTICIO_FLOW_TYPE === 'debug';
const tempFile = '/tmp/data.json';

function checkFileName(self, fileName, pattern) {
  if (fileName === undefined) {
    return false;
  }

  if (!pattern.test(fileName)) {
    self.logger.debug('Filename does not match pattern');
    return false;
  }

  if (fileName.split('.').pop() !== 'xml') {
    self.logger.debug('Provided fileName is not .xml file');
    return false;
  }

  return true;
}

const tooLargeErrMsg = (fileName, fileSize) => `Attachment ${fileName} is too large to be processed by XML component. `
  + `File limit is: ${MAX_FILE_SIZE} byte, file given was: ${fileSize} byte.`;

module.exports.process = async function processAction(msg, cfg) {
  const self = this;
  const { attachments, body = {} } = msg;
  const { pattern = '(.xml)', uploadSingleFile } = cfg || {};
  const files = [];
  if (uploadSingleFile) {
    files.push(msg.body);
  } else if (body.attachments && body.attachments.length > 0) {
    files.push(...(body.attachments || []));
  } else if (Object.keys(attachments || {}).length > 0) {
    const filteredFiles = Object.keys(attachments)
      .map((key) => ({ fileName: key, ...attachments[key] }))
      .filter((file) => checkFileName(self, file.fileName, new RegExp(pattern)));
    const tooLarge = filteredFiles.find((file) => file.size && file.size > MAX_FILE_SIZE);
    if (tooLarge) throw new Error(tooLargeErrMsg(tooLarge.fileName, tooLarge.size));
    files.push(...filteredFiles);
  }

  self.logger.info(`Attachment to XML started\nFound ${files.length} attachments`);

  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
  for (const file of files) {
    self.logger.info('Processing attachment');
    let response = await attachmentProcessor.getAttachment(file.url, 'text');
    this.logger.debug(`For provided filename response status: ${response.status}`);
    let responseBodyString = response.data;
    if (response.status >= 400) {
      throw new Error(`Error in making request to ${file.url} Status code: ${response.status}, Body: ${responseBodyString}`);
    }
    if (!responseBodyString) {
      throw new Error(`Empty attachment received for file ${file.fileName || ''}`);
    }
    const fileSize = response.headers['content-length'];
    response = null;
    if (Number(fileSize) > MAX_FILE_SIZE) throw new Error(tooLargeErrMsg(file.fileName || '', fileSize));
    let { body: json } = await xml2Json.process(this, responseBodyString);
    responseBodyString = null;
    await writeFile(tempFile, JSON.stringify(json));
    if ((await stat(tempFile)).size > MAX_FILE_SIZE_FOR_SAMPLE && isDebugFlow) {
      this.logger.warn('Size of the message is too large for sample, will try to generated smaller sample using structure from original file');
      const schema = createSchema(json);
      jsf.option({
        alwaysFakeOptionals: true,
        fillProperties: false,
      });
      json = jsf.generate(schema);
    }
    this.logger.debug(`Attachment to XML finished, emitting message. ${memUsage()}`);
    await self.emit('data', newMessageWithBody(json));
  }
};

async function getMetaModel(cfg) {
  return {
    in: cfg.uploadSingleFile ? attachmentToJsonIn.properties.attachments.items : attachmentToJsonIn,
    out: {},
  };
}

module.exports.getMetaModel = getMetaModel;
