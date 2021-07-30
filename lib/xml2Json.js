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
    explicitArray: false,
    normalizeTags: false,
    attrkey: '_attr',
    tagNameProcessors: [
      (name) => name.replace(':', '-'),
    ],
  };

  const regularParser = new xml2js.Parser({ ...parserConfig, explicitArray: false });

  const childArrayParser = new xml2js.Parser({ ...parserConfig, explicitArray: true });


  // eslint-disable-next-line func-names,no-shadow
  const returnFunc = function (self, parser) {
    return new Promise(((resolve, reject) => {
      parser.parseString(xmlString, (err, data) => {
        if (err) {
          self.logger.info('Error in xml2Json occurred');
          reject(new Error(invalidXmlMessage));
        }

        // helper function to emit individual array items
        const arrayEmitter = (childArray) => {
          for (let i = 0; i < childArray.length; i += 1) {
            if (Array.isArray(childArray[i])) arrayEmitter(childArray[i]);
            else self.emit('data', messages.newMessage(childArray[i]));
          }
        };

        // helper function to iterate through object and handle arrays, nested objects, and strings
        const objectEmitter = (childObj) => {
          const childElems = Object.keys(childObj);

          // eslint-disable-next-line no-restricted-syntax
          for (const child of childElems) {
            if (Array.isArray(childObj[child])) arrayEmitter(childObj[child]);
            else if (typeof childObj[child] === 'object') objectEmitter(childObj[child]);
            else self.emit('data', messages.newMessage(childObj[child]));
          }

          self.logger.info('Successfully converted XML to JSON');
          resolve();
        };

        // if customJsonata expression passed in, transform using custom mapping, otherwise transform with default
        const transformedResults = cfg.customJsonata ? transform(data, cfg, false) : transform(data, cfg, true);

        if (cfg.splitResult) objectEmitter(transformedResults);
        else {
          self.logger.info('Successfully converted XML to JSON');
          resolve(messages.newMessage(transformedResults));
        }
      });
    }));
  };

  return await cfg.childArray ? returnFunc(self, childArrayParser) : returnFunc(self, regularParser);
};
