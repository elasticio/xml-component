const xml2Json = require('../xml2Json');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
// eslint-disable-next-line no-unused-vars
module.exports.process = function processAction(msg, cfg) {
  if (!msg.body || !msg.body.xmlString) {
    this.emit('error', 'Missing XML String as input');
    this.emit('end');
    return;
  }
  // eslint-disable-next-line consistent-return
  return xml2Json.process(this, msg.body.xmlString);
};
