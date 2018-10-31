/* eslint-env node, jasmine */
'use strict';

const attachmentToJson = require('../lib/actions/attachmentToJson');
const json = require('./data/po.json');
const { expect } = require('chai');
const nock = require('nock');

require('chai').should(); // expect is assertion styles used my elastic.io
const sinon = require('sinon');

async function produceString(output) {
  //used to produce test output files

    let string = '';
    let outputResuslts;

    for (let i = 0; i < output.length; ++i) {
        outputResuslts = await output[i].args[1];
        console.log(outputResuslts.body);

        if (i !== 0) {
            string += ',\n';
        }
        string += JSON.stringify(outputResuslts.body);
    }

    return string;
}

describe('should convert XML attachment 2 JSON', () => {
    const mockSever = 'http://test.env.mock';
    const cfg = {};
    let emit;

    before(function testInit() {
        nock(mockSever)
          .get('/')
          .replyWithFile(200, 'spec/data/po.xml');
    });

    beforeEach(function testInit() {
        emit = sinon.spy();
    });

    it('Convert attachment to json', async () => {

        await attachmentToJson.process.bind({
            emit
        })({
            attachments: {
                'po.xml': {
                    url: mockSever
                }
            }
        }, cfg);

        const results = await produceString(emit.getCalls());
        console.log('XML attachment 2 JSON results: %j ', results);
        expect(JSON.parse(results)).to.be.deep.equal(json);
    });
});
