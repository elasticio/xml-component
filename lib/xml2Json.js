const { messages } = require('elasticio-node');
const xml2js = require('xml2js');

const invalidXmlMessage = 'Given XML is not valid or the file can not be read. '
  + 'See XML naming rules https://www.w3schools.com/xml/xml_elements.asp';

module.exports.process = async function xml2Json(self, xmlString) {
  if (!xmlString) {
    throw new Error('XML string is missing');
  }

  const parser = new xml2js.Parser({
    trim: false,
    normalize: false,
    explicitArray: false,
    normalizeTags: false,
    attrkey: '_attr',
    tagNameProcessors: [
      (name) => name.replace(':', '-'),
    ],
  });

  // eslint-disable-next-line func-names,no-shadow
  const returnFunc = function (self) {
    return new Promise(((resolve, reject) => {
      parser.parseString(xmlString, (err, data) => {
        if (err) {
          self.logger.info('Error in xml2Json occurred');
          reject(new Error(invalidXmlMessage));
        } else {
          self.logger.info('Successfully converted XML to JSON');
          resolve(messages.newMessageWithBody(data));
        }
      });
    }));
  };

  return returnFunc(self);
};
