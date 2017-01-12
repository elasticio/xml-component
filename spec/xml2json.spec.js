'use strict';
const action = require('../lib/actions/xmlToJson').process;

describe('XML 2 JSON parser', () => {
    const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8');
    const result = require('./data/po.json');
    it('should convert XML to json', (done) => {
      action.call({
        emit : (type, value) => {
          if (type && type === 'data') {
            expect(value).toBeDefined();
          } else if (type && type === 'end') {
            expect(value).toBeUndefined();
            done();
          }
        }
      }, {
        body: {
          xmlString: xml
        }
      }, {});
    });

});
