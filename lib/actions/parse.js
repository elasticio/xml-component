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
module.exports.process = function processAction(msg, cfg) {
  const wrapped = wrapper(this, msg, cfg, {});
  co(function* gen() {
    this.logger.debug('Action started...');
    // We need to make sure we execute initialization only once
    yield lock.acquireAsync();
    try {
      if (!unmarshaller) {
        this.logger.info('Mappings are not yet initialized, let us do that now');
        const cmd = `java -jar node_modules/jsonix/lib/jsonix-schema-compiler-full.jar \
          -d mappings \
          -p index \
          -generateJsonSchema \
          -compact \
          -logLevel DEBUG \
          "${cfg.schemaUri}"`;
        this.logger.debug('Starting JAVA process...');
        // eslint-disable-next-line no-unused-vars
        const out = yield exec(cmd);
        this.logger.debug('Generation completed');
        this.logger.debug('Loading mappings from ./mappings/index.js');
        // eslint-disable-next-line global-require, import/no-unresolved
        const mappings = require('../../mappings');
        this.logger.debug('Constructing Jsonix context');
        const context = new Jsonix.Context([mappings.index]);
        unmarshaller = context.createUnmarshaller();
        this.logger.info('Initialization successfully completed');
      }
    } finally {
      // Release the lock
      lock.release();
    }
    this.logger.info('Trying to find input data');
    if (msg.data.xml && typeof msg.data.xml === 'string') {
      this.logger.info('Found input data in incoming message length of XML is length=%s', msg.data.xml.length);
      const result = unmarshaller.unmarshalString(msg.data.xml);
      this.logger.debug('XML parsed to JSON');
      wrapped.emit('data', messages.newMessage(result));
    } else if (msg.attachments && Object.keys(msg.attachments).length > 0) {
      this.logger.info(`Found attachments in the message keys=${Object.keys(msg.attachments).length}`);
      wrapped.emit('data', msg);
    } else {
      this.logger.debug('No data XML payload found in the incoming message or it\'s attachments');
    }
    wrapped.emit('end');
  }.bind(this)).catch((err) => {
    this.logger.info('Error in parsing occurred');
    wrapped.emit('error', err);
    wrapped.emit('end');
  });
};
