'use strict';
const action = require('../lib/actions/jsonToXml').process;

describe('JSON 2 XML converter', () => {
  const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8').trim();
  const json = require('./data/po.json');
  it('should convert json to XML', (done) => {
    action.call({
      emit : (type, value) => {
        if (type && type === 'data') {
          expect(value).toBeDefined();
          expect(value.body).toBeDefined();
          expect(value.body.xmlString).toBeDefined();
          expect(value.body.xmlString).toEqual(xml);
        } else if (type && type === 'end') {
          expect(value).toBeUndefined();
          done();
        }
      }
    }, {
      body: json
    }, {});
  });
});
