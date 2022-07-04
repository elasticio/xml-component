/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
const xml2js = require('xml2js');
const { transform } = require('@openintegrationhub/ferryman');
const messages = require('./messages');

const invalidXmlMessage = 'Given XML is not valid or the file can not be read. '
  + 'See XML naming rules https://www.w3schools.com/xml/xml_elements.asp';

module.exports.process = async function xml2Json(self, xmlString, cfg) {
  if (!xmlString) {
    throw new Error('XML string is missing');
  }

  const parserConfig = {
    trim: false,
    normalize: false,
    normalizeTags: false,
    attrkey: '_attr',
    tagNameProcessors: [
      (name) => name.replace(':', '-'),
    ],
  };

  parserConfig.explicitArray = cfg.childArray;

  const parser = new xml2js.Parser(parserConfig);

  /**
     * Iterates through the provided object and removes the array specified with Key
     * Function returns an array containing the cleaned Object and the contents of the array removed
     * @param {String} key - Key for Array
     * @param {Object} obj - Object that contains the Array
     * @returns {Object}  - Clean Object
     * @returns {Array} - Array removed from object
     */
  function splitObject(key, obj) {
    if (!obj || !(obj instanceof Object)) {
      return [obj];
    }
    const { [key]: bar, ...cleanObj } = obj;
    let arr = bar;
    Object.keys(cleanObj).forEach((value) => {
      const result = splitObject(key, cleanObj[value]);
      cleanObj[value] = result[0];
      if (!arr) {
        arr = result[1];
      }
    });
    return [cleanObj, arr];
  }

  // eslint-disable-next-line func-names,no-shadow
  const returnFunc = function (self) {
    return new Promise(((resolve, reject) => {
      parser.parseString(xmlString, async (err, data) => {
        if (err) {
          self.logger.info('Error in xml2Json occurred');
          reject(new Error(invalidXmlMessage));
        } else {
          const jsonataResult = cfg.customJsonata ? transform(data, { customMapping: cfg.customJsonata }, false) : data;
          if (!jsonataResult) {
            throw new Error('Error in JSONata transformation');
          }

          if (!cfg.splitResult) {
            self.logger.info('Successfully converted XML to JSON');
            resolve(messages.newMessage(jsonataResult));
            return;
          }

          try {
            const { arrayWrapperName, arrayElementName } = cfg.splitResult;

            const batchSize = cfg.splitResult.batchSize ? cfg.splitResult.batchSize : 1;
            self.logger.debug(`Batching: batch size is ${batchSize}`);
            self.logger.debug(`Batching: key for array to split is ${arrayElementName}`);
            self.logger.debug(`Batching: JSONata Result is ${JSON.stringify(jsonataResult)}`);

            const [result, elements] = splitObject(arrayElementName, jsonataResult);

            const arrayToSplit = Array.isArray(elements) ? elements : [elements];

            self.logger.debug(`this is array to split ${JSON.stringify(arrayToSplit)}`);
            self.logger.debug(`this is result object from split: ${JSON.stringify(result)}`);
            while (arrayToSplit.length > 0) {
              const currentBatch = arrayToSplit.splice(0, batchSize);
              self.logger.info(`Batching: current batch is ${JSON.stringify(currentBatch)}`);
              // deep clones result object
              const msg = JSON.parse(JSON.stringify(result));
              msg[arrayWrapperName][arrayElementName] = currentBatch;

              self.logger.info(`Batching: emitting message ${JSON.stringify(msg)}`);
              self.emit('data', messages.newMessage(msg));
            }
            resolve();
          } catch (e) {
            self.logger.error('Error while splitting result');
            reject(e);
          }
        }
      });
    }));
  };

  return returnFunc(self);
};
