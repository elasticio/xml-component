const co = require('co');
const exec = require('promised-exec');
const AwaitLock = require('await-lock');
const { Jsonix } = require('jsonix');
const { wrapper } = require('@blendededge/ferryman-extensions');
const messages = require('../messages');

const lock = new AwaitLock();
let unmarshaller;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``data`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
module.exports.process = async function processAction(msg, cfg, snapshot, headers, tokenData) {
  const wrapped = await wrapper(this, msg, cfg, snapshot, headers, tokenData);
  co(function* gen() {
    wrapped.logger.debug('Action started...');
    // We need to make sure we execute initialization only once
    yield lock.acquireAsync();
    try {
      if (!unmarshaller) {
        wrapped.logger.info('Mappings are not yet initialized, let us do that now');
        const cmd = `java -jar node_modules/jsonix/lib/jsonix-schema-compiler-full.jar \
          -d mappings \
          -p index \
          -generateJsonSchema \
          -compact \
          -logLevel DEBUG \
          "${cfg.schemaUri}"`;
        wrapped.logger.debug('Starting JAVA process...');
        // eslint-disable-next-line no-unused-vars
        const out = yield exec(cmd);
        wrapped.logger.debug('Generation completed');
        wrapped.logger.debug('Loading mappings from ./mappings/index.js');
        // eslint-disable-next-line global-require, import/no-unresolved, import/extensions
        const mappings = require('../../mappings/index');
        wrapped.logger.debug('Constructing Jsonix context');
        const context = new Jsonix.Context([mappings.index]);
        unmarshaller = context.createUnmarshaller();
        wrapped.logger.info('Initialization successfully completed');
      }
    } finally {
      // Release the lock
      lock.release();
    }
    wrapped.logger.info('Trying to find input data');
    if (msg.data.xml && typeof msg.data.xml === 'string') {
      wrapped.logger.info('Found input data in incoming message length of XML is length=%s', msg.data.xml.length);
      const result = unmarshaller.unmarshalString(msg.data.xml);
      wrapped.logger.debug('XML parsed to JSON');
      wrapped.emit('data', messages.newMessage(result));
    } else if (msg.attachments && Object.keys(msg.attachments).length > 0) {
      wrapped.logger.info(`Found attachments in the message keys=${Object.keys(msg.attachments).length}`);
      wrapped.emit('data', msg);
    } else {
      wrapped.logger.debug('No data XML payload found in the incoming message or it\'s attachments');
    }
    wrapped.emit('end');
  }).catch((err) => {
    wrapped.logger.error('Error in parsing occurred', err);
    wrapped.emit('error', err);
    wrapped.emit('end');
  });
};
