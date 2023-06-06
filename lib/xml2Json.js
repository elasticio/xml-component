/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const xml2js = require('xml2js');

module.exports.process = async function xml2Json(self, xmlString) {
  if (!xmlString) {
    throw new Error('XML string is missing');
  }

  let parser = new xml2js.Parser({
    trim: false,
    normalize: false,
    explicitArray: false,
    normalizeTags: false,
    attrkey: '_attr',
    tagNameProcessors: [
      (name) => name.replace(':', '-'),
    ],
  });
  const data = await parser.parseStringPromise(xmlString);
  xmlString = null;
  parser = null;
  self.logger.info('Successfully converted XML to JSON');
  return messages.newMessageWithBody(data);
};
