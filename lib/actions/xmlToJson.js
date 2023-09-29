const { wrapper } = require('@blendededge/ferryman-extensions');
const xml2Json = require('../xml2Json');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``data`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
// eslint-disable-next-line no-unused-vars
module.exports.process = async function processAction(msg, cfg, snapshot, headers, tokenData) {
  const wrapped = await wrapper(this, msg, cfg, snapshot, headers, tokenData);
  if (!msg.data || !msg.data.xmlString) {
    wrapped.emit('error', 'Missing XML String as input');
    wrapped.emit('end');
    return;
  }
  // eslint-disable-next-line consistent-return
  return xml2Json.process(wrapped, msg.data.xmlString, cfg);
};
