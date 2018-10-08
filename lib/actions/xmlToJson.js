/*eslint no-invalid-this: 0 no-console: 0*/
const xml2Json = require('../xml2Json.js');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
module.exports.process = function processAction(msg, cfg) {
    console.log('Action started, message=%j cfg=%j', msg, cfg);
    if (!msg.body || !msg.body.xmlString) {
        this.emit('error', 'Missing XML String as input');
        this.emit('end');
        return;
    }
    return xml2Json.process(msg);

};
