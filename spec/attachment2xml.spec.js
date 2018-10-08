/* eslint-env node, jasmine */
'use strict';

const attachmentToJson = require('../lib/actions/attachmentToJson');
const json = require('./data/po.json');
const { expect } = require('chai');
const nock = require('nock');
const streamString = require('stream-string');


require('chai').should(); // expect is assertion styles used my elastic.io
const fs = require('fs');

describe('should convert XML attachment 2 JSON', () => {
    const mockSever = 'http://test.env.mock';

    before(function testInit() {
        nock(mockSever)
          .get('/')
          .replyWithFile(200, 'spec/data/po.xml');
    });

    it('Convert attachment to json', async () => {
        const msg = {
            attachments: {
                'po.xml': {
                    url: mockSever
                }
            }
        };
        const { body } = await attachmentToJson.process(msg, {});
        console.log('XML attachment 2 JSON results: %j ', body);
        expect(body).to.be.deep.equal(json);
    });
});
