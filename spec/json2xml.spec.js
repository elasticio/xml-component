const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');

const { AttachmentProcessor } = require('@blendededge/ferryman-extensions');

chai.use(chaiAsPromised);
const { expect } = chai;

const json2xml = require('../lib/actions/jsonToXml');

const context = {
  emit: sinon.spy(),
  logger: {
    debug: () => {},
    info: () => {},
  },
};

const inputMessage = {
  data: {
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
const expectedOutputStringWithHeaders = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">\n  <ORDERRESPONSE_HEADER>\n    <ORDERRESPONSE_INFO>\n      <ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>\n      <ORDER_ID>1234</ORDER_ID>\n    </ORDERRESPONSE_INFO>\n  </ORDERRESPONSE_HEADER>\n  <ORDERRESPONSE_ITEM_LIST/>\n</ORDERRESPONSE>';
const expectedOutputStringWithoutHeaders = '<ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">\n  <ORDERRESPONSE_HEADER>\n    <ORDERRESPONSE_INFO>\n      <ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>\n      <ORDER_ID>1234</ORDER_ID>\n    </ORDERRESPONSE_INFO>\n  </ORDERRESPONSE_HEADER>\n  <ORDERRESPONSE_ITEM_LIST/>\n</ORDERRESPONSE>';

describe('JSON to XML', () => {
  afterEach(() => {
    context.emit.resetHistory();
  });

  it('Send as body', async () => {
    const msg = JSON.parse(JSON.stringify(inputMessage));

    const cfg = {
      uploadToAttachment: false,
      excludeXmlHeader: false,
      headerStandalone: false,
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].data).to.deep.eql({
      xmlString: expectedOutputStringWithHeaders,
    });
  });

  const attachmentStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').returns({
    config: {
      url: 'someUrl',
    },
  });

  it('Send as Attachment', async () => {
    const msg = JSON.parse(JSON.stringify(inputMessage));

    const cfg = {
      uploadToAttachment: true,
      excludeXmlHeader: true,
      headerStandalone: false,
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].data).to.deep.eql({
      attachmentUrl: 'someUrl',
      attachmentSize: 327,
    });
    expect(attachmentStub.getCall(0).args[0]).to.be.eql(expectedOutputStringWithoutHeaders);
  });


  it('Send as Attachment with custom file name', async () => {
    const msg = JSON.parse(JSON.stringify(inputMessage));

    const cfg = {
      uploadToAttachment: true,
      excludeXmlHeader: true,
      headerStandalone: false,
      filenameJsonata: '"testName.xml"',
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCall(0).args[1].attachments['testName.xml']).to.deep.eql({
      url: 'someUrl',
      size: 327,
    });
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(attachmentStub.getCall(1).args[0]).to.be.eql(expectedOutputStringWithoutHeaders);
  });

  it('Too Long Attachment', async () => {
    const reallyLongString = new Array(15 * 1024 * 1024).join('a');
    const msg = {
      data: {
        input: {
          example: reallyLongString,
        },
      },
    };

    const cfg = {
      uploadToAttachment: true,
      excludeXmlHeader: false,
      headerStandalone: false,
    };

    await expect(json2xml.process.call(context, msg, cfg, {})).to.be.rejectedWith('XML data is 15728713 bytes, and is too large to upload as an attachment. Max attachment size is 10485760 bytes');
  });

  it('Non object input', async () => {
    const msg = {
      data: {
        input: [{
          example: 'something',
        }, {
          foo: 'bar',
        }],
      },
    };
    const cfg = {};

    await expect(json2xml.process.call(context, msg, cfg, {})).to.be.rejectedWith('Input must be an object with exactly one key.');
  });

  it('Too many keys input', async () => {
    const msg = {
      data: {
        input: {
          foo: 'bar',
          bar: 'baz',
        },
      },
    };
    const cfg = {};

    await expect(json2xml.process.call(context, msg, cfg, {})).to.be.rejectedWith('Input must be an object with exactly one key.');
  });

  it('Invalid xml tag name', async () => {
    const msg = {
      data: {
        input: {
          archs: {
            arm: true,
            amd64: true,
            386: true,
          },
        },
      },
    };
    const cfg = {};

    await expect(json2xml.process.call(context, msg, cfg, {})).to.be.rejectedWith('Invalid character in name');
  });

  it('should convert JSON to XML 1', async () => {
    const xml = fs.readFileSync('./spec/data/po.xml', 'utf-8').trim();
    // eslint-disable-next-line global-require
    const json = require('./data/po.json');
    const msg = {
      data: {
        input: json,
      },
    };

    const cfg = {
      uploadToAttachment: false,
      excludeXmlHeader: false,
      headerStandalone: true,
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].data).to.deep.eql({
      xmlString: xml,
    });
  });

  it('Readme demo code', async () => {
    const msg = {
      data: {
        input: {
          someTag: {
            _attr: {
              id: 'my id',
            },
            _: 'my inner text',
          },
        },
      },
    };

    const cfg = {
      uploadToAttachment: false,
      excludeXmlHeader: true,
      headerStandalone: true,
    };

    await json2xml.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].data).to.deep.eql({
      xmlString: '<someTag id="my id">my inner text</someTag>',
    });
  });

  describe('Render Options Config', () => {
    afterEach(() => {
      context.emit.resetHistory();
    });

    it('Pretty false', async () => {
      const msg = {
        data: {
          input: inputMessage,
        },
      };

      const cfg = {
        renderOpts: {
          pretty: false,
        },
      };

      const expectedOutput = '<?xml version="1.0" encoding="UTF-8"?><data><input><ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1"><ORDERRESPONSE_HEADER><ORDERRESPONSE_INFO><ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE><ORDER_ID>1234</ORDER_ID></ORDERRESPONSE_INFO></ORDERRESPONSE_HEADER><ORDERRESPONSE_ITEM_LIST/></ORDERRESPONSE></input></data>';

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.deep.eql(expectedOutput);
    });

    it('Not provided', async () => {
      const msg = {
        data: {
          input: inputMessage,
        },
      };

      const cfg = {};

      const expectedOutput = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n  <input>\n    <ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">\n      <ORDERRESPONSE_HEADER>\n        <ORDERRESPONSE_INFO>\n          <ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>\n          <ORDER_ID>1234</ORDER_ID>\n        </ORDERRESPONSE_INFO>\n      </ORDERRESPONSE_HEADER>\n      <ORDERRESPONSE_ITEM_LIST/>\n    </ORDERRESPONSE>\n  </input>\n</data>';

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.deep.eql(expectedOutput);
    });

    it('Pretty true, different new line char and additional indent spaces', async () => {
      const msg = {
        data: {
          input: inputMessage,
        },
      };

      const cfg = {
        renderOpts: {
          pretty: true,
          newline: 'NEWLINE',
          indent: 'INDENT',
        },
      };

      const expectedOutput = '<?xml version="1.0" encoding="UTF-8"?>NEWLINE<data>NEWLINEINDENT<input>NEWLINEINDENTINDENT<ORDERRESPONSE xmlns:ns2="http://www.bmecat.org/bmecat/2005" version="2.1">NEWLINEINDENTINDENTINDENT<ORDERRESPONSE_HEADER>NEWLINEINDENTINDENTINDENTINDENT<ORDERRESPONSE_INFO>NEWLINEINDENTINDENTINDENTINDENTINDENT<ORDERRESPONSE_DATE>2020-04-07T09:07:45.188Z</ORDERRESPONSE_DATE>NEWLINEINDENTINDENTINDENTINDENTINDENT<ORDER_ID>1234</ORDER_ID>NEWLINEINDENTINDENTINDENTINDENT</ORDERRESPONSE_INFO>NEWLINEINDENTINDENTINDENT</ORDERRESPONSE_HEADER>NEWLINEINDENTINDENTINDENT<ORDERRESPONSE_ITEM_LIST/>NEWLINEINDENTINDENT</ORDERRESPONSE>NEWLINEINDENT</input>NEWLINE</data>';

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.deep.eql(expectedOutput);
    });
  });

  describe('CData Config Options', () => {
    afterEach(() => {
      context.emit.resetHistory();
    });

    it('True', async () => {
      const msg = {
        data: {
          input: {
            nested: {
              xml: '<?xml version="1.0" encoding="UTF-8"?><parent><child>value</child></parent>',
            },
          },
        },
      };

      const cfg = {
        cData: true,
      };

      const expectedOutput = '<?xml version="1.0" encoding="UTF-8"?>\n<nested>\n  <xml><![CDATA[<?xml version="1.0" encoding="UTF-8"?><parent><child>value</child></parent>]]></xml>\n</nested>';

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.deep.eql(expectedOutput);
    });

    it('False', async () => {
      const msg = {
        data: {
          input: {
            nested: {
              xml: '<?xml version="1.0" encoding="UTF-8"?><parent><child>value</child></parent>',
            },
          },
        },
      };

      const cfg = {
        cData: false,
      };

      const expectedOutput = '<?xml version="1.0" encoding="UTF-8"?>\n<nested>\n  <xml>&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;parent&gt;&lt;child&gt;value&lt;/child&gt;&lt;/parent&gt;</xml>\n</nested>';

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.deep.eql(expectedOutput);
    });
  });

  describe('DocType Config Options', async () => {
    afterEach(() => {
      context.emit.resetHistory();
    });

    it('CXML', async () => {
      const msg = {
        data: {
          input: inputMessage,
        },
      };

      const cfg = {
        docType: 'http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd',
        excludeXmlHeader: false,
      };

      await json2xml.process.call(context, msg, cfg, {});
      expect(context.emit.getCalls().length).to.be.eql(1);
      expect(context.emit.getCall(0).args[1].data.xmlString).to.contain('<!DOCTYPE data SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">');
    });
  });
});
