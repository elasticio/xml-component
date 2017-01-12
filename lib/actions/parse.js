/*eslint no-invalid-this: 0 no-console: 0*/
const elasticio = require('elasticio-node');
const messages = elasticio.messages;
const co = require('co');
const exec = require('promised-exec');
const AwaitLock = require('await-lock');
const Jsonix = require('jsonix').Jsonix;
const lock = new AwaitLock();
let unmarshaller;

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
    co(function* gen() {
        console.log('Action started cfg=%j', cfg);
    // We need to make sure we execute initialization only once
        yield lock.acquireAsync();
        try {
            if (!unmarshaller) {
                console.log('Mappings are not yet initialized, let us do that now');
                let cmd = `java -jar node_modules/jsonix/lib/jsonix-schema-compiler-full.jar \
          -d mappings \
          -p index \
          -generateJsonSchema \
          -compact \
          -logLevel DEBUG \
          "${cfg.schemaUri}"`;
                console.log('Starting JAVA process cmd=%s', cmd);
                const out = yield exec(cmd);
                console.log('%s\nGeneration completed', out);
                console.log('Loading mappings from ./mappings/index.js');
                const mappings = require('../../mappings');
                console.log('Constructing Jsonix context');
                const context = new Jsonix.Context([mappings.index]);
                unmarshaller = context.createUnmarshaller();
                console.log('Initialization successfully completed');
            }
        } finally {
      // Release the lock
            lock.release();
        }
        console.log('Trying to find input data');
        if (msg.body.xml && typeof msg.body.xml === 'string') {
            console.log('Found input data in incoming message length of XML is length=%s', msg.body.xml.length);
            var result = unmarshaller.unmarshalString(msg.body.xml);
            console.log('Parsed XML to JSON json=%j', result);
            this.emit('data', messages.newMessageWithBody(result));
        } else if (msg.attachments && Object.keys(msg.attachments).length > 0) {
            console.log('Found attachments in the message keys=%s', Object.keys(msg.attachments));
            this.emit('data', msg);
        } else {
            console.log('No data XML payload found in the incoming message or it\'s attachments, '
              + 'no processing will be done msg=%j', msg);
        }
        this.emit('end');
    }.bind(this)).catch(err => {
        console.log('Error occurred', err.stack || err);
        this.emit('error', err);
        this.emit('end');
    });
}
