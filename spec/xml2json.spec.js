/* eslint-env node, jasmine */
const { expect } = require('chai');
const fs = require('fs');
const logger = require('@elastic.io/component-logger')();
const xmlToJson = require('../lib/actions/xmlToJson');

describe('XML 2 JSON parser', () => {
  let self;

  beforeEach(() => {
    self = {
      logger,
    };
  });

  it('should convert XML to JSON', async () => {
    const xml = fs.readFileSync('./spec/data/po.xml', 'utf-8');
    // eslint-disable-next-line global-require
    const result = require('./data/po.json');

    const message = {
      body: {
        xmlString: xml,
      },
    };
    const { body } = await xmlToJson.process.bind(self)(message, {});
    expect(body).to.deep.equal(result);
  });

  it('should fail due to an invalid JSON', async () => {
    const xml = fs.readFileSync('./spec/data/invalidXml.xml', 'utf-8');

    const message = {
      body: {
        xmlString: xml,
      },
    };
    const messageText = 'Unencoded <\nLine: 2\nColumn: 4\nChar: 3';

    await xmlToJson.process.bind(self)(message, {}).catch((error) => {
      expect(error.message).to.equal(messageText);
    });
  });
});
