/* eslint-env node, jasmine */
const { expect } = require('chai');
const fs = require('fs');
const jsonToXml = require('../lib/actions/jsonToXmlOld');

describe('JSON 2 XML converter (Old)', () => {
  let self;

  beforeEach(() => {
    self = {
      logger: {
        debug: () => {},
        info: () => {},
        child: () => self.logger,
      },
    };
  });

  it('should convert JSON to XML 1', async () => {
    const xml = fs.readFileSync('./spec/data/po.xml', 'utf-8').trim();
    // eslint-disable-next-line global-require
    const json = require('./data/po.json');
    const message = {
      data: json,
      metadata: {},
    };
    const { xmlString } = (await jsonToXml.process.bind(self)(message, {})).data;
    expect(xmlString).to.deep.equal(xml);
  });

  it('should convert JSON to XML 2', async () => {
    const json = {
      archs: {
        arm: true,
        amd64: true,
        386: true,
      },
    };

    const message = {
      data: json,
      metadata: {},
    };

    const messageText = 'Can\'t create XML element from prop that starts with digit.'
      + 'See XML naming rules https://www.w3schools.com/xml/xml_elements.asp';

    await jsonToXml.process.call(self, message, {}).catch((error) => {
      expect(error.message).to.equal(`Prop name is invalid for XML tag: 386. ${messageText}`);
    });
  });
});
