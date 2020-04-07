const logger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const sinon = require('sinon');
const { expect } = require('chai');
// const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

const json2xml = require('../lib/actions/jsonToXml');

const context = {
  emit: sinon.spy(),
  logger,
};


describe('JSON to XML', () => {
  afterEach(() => {
    context.emit.resetHistory();
  });

  it('Send as body', async () => {
    const msg = {
      body: {
        input: {
          ORDERRESPONSE: {
            _attr: {
              'xmlns:ns2': 'http://www.bmecat.org/bmecat/2005',
              version: '2.1',
            },
            ORDERRESPONSE_HEADER: {
              ORDERRESPONSE_INFO: {
                ORDERRESPONSE_DATE: '2020-04-07T09:07:45.188Z',
                ORDER_ID: '1234',
              },
            },
            ORDERRESPONSE_ITEM_LIST: {},
          },
        },
      },
    };

    const cfg = {};

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql('');
  });
});
