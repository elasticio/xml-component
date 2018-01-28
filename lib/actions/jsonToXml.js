/*eslint no-invalid-this: 0 no-console: 0*/
const eioUtils = require('elasticio-node').messages;
const xml2js = require('xml2js');
const _ = require('lodash');

const ERROR = 'Prop name is invalid for xml tag';

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
 * @param {Object} value
 * @param {Object} key
 */
function validateJsonPropNames(value, key) {
    if (propNameIsInvalid(key)) {
        throw new Error(ERROR + ': ' + key);
    }

    if (!_.isPlainObject(value)) {
        return;
    }

    for (const prop of Object.keys(value)) {
        validateJsonPropNames(value[prop], prop);
    }
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
    console.log('Action started, message=%j cfg=%j', msg, cfg);
    const options = {
        trim: false,
        normalize: false,
        explicitArray: false,
        normalizeTags: false,
        attrkey: '_attr',
        tagNameProcessors: [
            (name) => name.replace(':', '-')
        ]
    };
    const builder = new xml2js.Builder(options);

    const jsonToTransform = msg.body;

    validateJsonPropNames(jsonToTransform);

    const result = builder.buildObject(jsonToTransform);
    console.log('Successfully converted body to XML result=%s', result);
    return eioUtils.newMessageWithBody({
        xmlString: result
    });
}

module.exports.process = processAction;
