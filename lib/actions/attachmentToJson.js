/* eslint-disable no-await-in-loop, no-restricted-syntax, max-len, no-unused-vars, no-loop-func */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { createSchema } = require('genson-js');
const jsf = require('json-schema-faker');
const sizeof = require('object-sizeof');
const { messages } = require('../utils');
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

const DEFAULT_ATTACHMENT_ENCODING = 'utf-8';

function resolveEncoding(headers = {}) {
  const contentTypeHeader = headers['content-type'] || headers['Content-Type'];
  if (!contentTypeHeader) return DEFAULT_ATTACHMENT_ENCODING;
  const charsetMatch = /charset=([^;]+)/i.exec(contentTypeHeader);
  return charsetMatch ? charsetMatch[1].trim().toLowerCase() : DEFAULT_ATTACHMENT_ENCODING;
}

async function attachmentDataToBuffer(data) {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Unsupported attachment response payload type');
}

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
    let response = await attachmentProcessor.getAttachment(file.url, 'stream');
    this.logger.debug(`For provided filename response status: ${response.status}`);
    let attachmentBuffer = await attachmentDataToBuffer(response.data);
    let responseBodyString = attachmentBuffer.toString(resolveEncoding(response.headers));
    if (response.status >= 400) {
      throw new Error(`Error in making request to ${file.url} Status code: ${response.status}, Body: ${responseBodyString}`);
    }
    if (!responseBodyString) {
      throw new Error(`Empty attachment received for file ${file.fileName || ''}`);
    }
    const fileSizeHeader = response.headers['content-length'];
    const fileSize = Number(fileSizeHeader) || attachmentBuffer.length;
    response = null;
    if (Number(fileSize) > MAX_FILE_SIZE) throw new Error(tooLargeErrMsg(file.fileName || '', fileSize));
    let { body: json } = await xml2Json.process(this, responseBodyString);
    responseBodyString = null;
    attachmentBuffer = null;
    await writeFile(tempFile, JSON.stringify(json));
    if ((await stat(tempFile)).size > MAX_FILE_SIZE_FOR_SAMPLE && isDebugFlow) {
      this.logger.warn('The message size exceeded the sample size limit. To match the limitation we will generate a smaller sample using the structure/schema from the original file.');
      const schema = createSchema(json);
      jsf.option({
        alwaysFakeOptionals: true,
        fillProperties: false,
      });
      json = jsf.generate(schema);
    }
    this.logger.debug(`Attachment to XML finished, emitting message. ${memUsage()}`);
    await self.emit('data', messages.newMessageWithBody(json));
  }
};

async function getMetaModel(cfg) {
  return {
    in: cfg.uploadSingleFile ? attachmentToJsonIn.properties.attachments.items : attachmentToJsonIn,
    out: {},
  };
}

module.exports.getMetaModel = getMetaModel;
