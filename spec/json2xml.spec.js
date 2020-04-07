const logger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

chai.use(chaiAsPromised);
const { expect } = chai;

const json2xml = require('../lib/actions/jsonToXml');

const context = {
  emit: sinon.spy(),
  logger,
};

const inputMessage = {
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
const expectedOutputStringWithHeaders = '<?xml version="1.0" standalone="no"?>\n<ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">\n  <ORDERRESPONSE_HEADER>\n    <ORDERRESPONSE_INFO>\n      <ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>\n      <ORDER_ID>1234</ORDER_ID>\n    </ORDERRESPONSE_INFO>\n  </ORDERRESPONSE_HEADER>\n  <ORDERRESPONSE_ITEM_LIST/>\n</ORDERRESPONSE>';
const expectedOutputStringWithoutHeaders = '<ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">\n  <ORDERRESPONSE_HEADER>\n    <ORDERRESPONSE_INFO>\n      <ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>\n      <ORDER_ID>1234</ORDER_ID>\n    </ORDERRESPONSE_INFO>\n  </ORDERRESPONSE_HEADER>\n  <ORDERRESPONSE_ITEM_LIST/>\n</ORDERRESPONSE>';

describe('JSON to XML', () => {
  afterEach(() => {
    context.emit.resetHistory();
  });

  it('Send as body', async () => {
    const msg = JSON.parse(JSON.stringify(inputMessage));

    const cfg = {
      uploadToAttachment: false,
      includeXmlHeader: true,
      headerStandalone: false,
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql({
      xmlString: expectedOutputStringWithHeaders,
    });
  });

  it('Send as Attachment', async () => {
    const msg = JSON.parse(JSON.stringify(inputMessage));

    const cfg = {
      uploadToAttachment: true,
      includeXmlHeader: false,
      headerStandalone: false,
    };

    const attachmentStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').returns({
      config: {
        url: 'someUrl',
      },
    });

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql({
      attachmentUrl: 'someUrl',
      attachmentSize: 327,
    });
    expect(attachmentStub.getCall(0).args[0]).to.be.eql(expectedOutputStringWithoutHeaders);
  });

  it('Too Long Attachment', async () => {
    const reallyLongString = new Array(15 * 1024 * 1024).join('a');
    const msg = {
      body: {
        input: {
          example: reallyLongString,
        },
      },
    };

    const cfg = {
      uploadToAttachment: true,
      includeXmlHeader: false,
      headerStandalone: false,
    };

    expect(json2xml.process.call(context, msg, cfg, {})).to.be.rejectedWith('XML data is 15728658 bytes, and is too large to upload as an attachment. Max attachment size is 10485760 bytes');
  });
});
