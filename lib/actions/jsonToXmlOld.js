const xml2js = require('xml2js');
const _ = require('lodash');
const { wrapper } = require('@blendededge/ferryman-extensions');
const messages = require('../messages');

const ERROR = 'Prop name is invalid for XML tag';

/**
 * Checks whether property name is valid
 * @param {String} key - propName
 * @returns {Boolean} - valid prop or not
 */
const propNameIsInvalid = (key) => /^\d/.test(key);

/**
 * Checks whether object contains properties
 * that startsWith number
 * @see https://github.com/elasticio/xml-component/issues/1
 * @param {Object|Number|String} value
 * @param {String} key
 */
function validateJsonPropNames(value, key) {
  if (propNameIsInvalid(key)) {
    const message = 'Can\'t create XML element from prop that starts with digit.'
      + 'See XML naming rules https://www.w3schools.com/xml/xml_elements.asp';
    throw new Error(`${ERROR}: ${key}. ${message}`);
  }

  if (!_.isPlainObject(value)) {
    return;
  }

  Object.keys(value).forEach((prop) => {
    validateJsonPropNames(value[prop], prop);
  });
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``data`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
// eslint-disable-next-line no-unused-vars
async function processAction(msg, cfg, snapshot, headers, tokenData) {
  const self = await wrapper(this, msg, cfg, snapshot, headers, tokenData);
  self.logger.debug('Action started...');
  const options = {
    trim: false,
    normalize: false,
    explicitArray: false,
    normalizeTags: false,
    attrkey: '_attr',
    tagNameProcessors: [
      (name) => name.replace(':', '-'),
    ],
  };
  const builder = new xml2js.Builder(options);

  const jsonToTransform = msg.data;

  validateJsonPropNames(jsonToTransform);

  const result = builder.buildObject(jsonToTransform);
  self.logger.debug('Successfully converted body to XML');
  return messages.newMessage({
    xmlString: result,
  });
}

module.exports.process = processAction;
