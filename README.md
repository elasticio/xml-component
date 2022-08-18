# XML Component

The **XML Component** transforms XML attachments and strings to JSON and JSON to either XML strings or attachments. It is useful when using Open Integration Hub flows that interact with XML documents, because the message data being acted on during a flow is formatted as JSON.

The **XML Component** requires that XML documents "in" be [well-formed](https://en.wikipedia.org/wiki/Well-formed_document) to be parsed correctly. If the XML is not well-formed, the component will emit an error.

The JSON "in" must be a single object at the top level, because XML documents must be contained in a single "root" tag.

[JSON inputs can not have any field names which are not valid as XML tag names:](https://www.w3schools.com/xml/xml_elements.asp)
* They must start with a letter or underscore
* They cannot start with the letters xml (or XML, or Xml, etc)
* They must only contain letters, digits, hyphens, underscores, and periods

XML attributes on a tag can be defined with JSON by creating an `_attr` sub-object in the input JSON.

The inner-text of an XML element can also be controlled with an underscore `_` sub-object.

For example:
```json
{
  "someTag": {
    "_attr": {
      "id": "my id"
    },
    "_": "my inner text"
  }
}
```
is equivalent to
```xml
<someTag id="my id">my inner text</someTag>
```

## Functions & Configuration Fields
The following is a complete list of configuration fields that are available on this component.

### xmlToJson
Takes an XML string and converts it to generic JSON object. The XML string to be converted must live at `msg.data.xmlString`. Note: The values inside xml tags will be converting into string only, e.g.:

```xml
<element>
  <date>2015-09-01</date>
  <quantity>100</quantity>
</element>
```
will be converted into:
```json
{
  "element": {
    "date": "2015-09-01",
    "quantity": "100"
  }
}
```

The following configuration options are supported:
- **customJsonata**: Accepts a JSONata expression to be applied to JSON result to transform the data further.
- **childArray**: A boolean value. If true, all child elements in JSON result will be in an array, regardless of the number of elements. i.e.,
```json
{
  "address": "123 Main Street"
}
```
will be converted to:
```json
{
  "address": [ "123 Main Street" ]
}
```
- **pattern**: Optionally, provide a regular expression to only convert certain entries in the **attachments** object to JSON.
- **splitResult**: An object containing `arrayWrapperName`, `arrayElementName`, and `batchSize`. The splitResult allows the user to select an array of individual records from the resulting JSON object and emit the records in batches.

For example, the below XML file and configuration object will result in 3 separate messages.

**Incoming XML File**
```xml
<records>
  <record>
    <name>Alice Smith</name>
  </record>
  <record>
    <name>Robert Smith</name>
  </record>
  <record>
    <name>Joe Smith</name>
  </record>
</records>
```
**JSON configuration**
```json
{
  "splitResult": {
    "arrayWrapperName": "records",
    "arrayElementName": "record",
    "batchSize": 1
  }
}
```
**Resulting Messages**
```json
{
  "data": {
    "records": {
      "record": ["Alice Smith"]
    }
  }
}
{
  "data": {
    "records": {
      "record": ["Robert Smith"]
    }
  }
}
{
  "data": {
    "records": {
      "record": ["Joe Smith"]
    }
  }
}
```

### attachmentToJson
Looks at the JSON array of attachments passed in to component and converts all XML that it finds to JSON objects. It then produces one outbound message per matching attachment. As input, the user can enter a pattern for filtering files by name or leave this field empty for processing all incoming *.xml files.

The following configuration options are supported:
* **customJsonata**: Refer to **xmlToJson** step for usage instructions.
* **childArray**: Refer to **xmlToJson** step for usage instructions.
* **maxFileSize**: If provided, overwrites the existing `MAX_FILE_SIZE` variable which controls the maximum size of an attachment to be written in MB.
* **splitResult**: Refer to **xmlToJson** step for usage instructions.

### jsonToXmlV2
Converts JSON from the message, specified by a JSONata expression, into an XML string.

Note: the jsonToXml function should not be used for new implementations, but it has been left in the component for backwards compatibility. jsonToXmlV2 has updated functionality.

This function uses the [Node library xml2Js](https://www.npmjs.com/package/xml2js) to perform XML-JSON conversion. Reviiew that documentation for details on how to structure JSON to produce the desired XML output.

Note the following xml2Js options, which are hardcoded into this function's logic.
- trim: false
- normalize: false
- explicitArray: false
- normalizeTags: false
- attrkey: '_attr'
- explicitRoot: false

The component expects the incoming message to have a single field `input` set to the JSON that will be converted to XML. For example:
```json
{
  "input": {
             "someTag": {
               "_attr": {
                 "id": "my id"
               },
               "_": "my inner text"
             }
           }
}
```

The following configuration options are supported:

- **attachmentStorageUrl**: Override the environment variable that defines the attachment service's URL. This is not recommended for most use cases.
- **excludeXmlHeader**: When true, no XML header of the form `<?xml version="1.0" encoding="UTF-8" standalone="no"?>` will be prepended to the XML output.
- **filenameJsonata**: When outputting as an attachment, specify a JSONata expression that creates a dynamic filename for the attachment. The JSONata executes relative to `msg`. If this is not specified, the component will output the file as `jsonToXml.xml`.
- **headerStandalone**: Specify whether to set the `standalone` attribute to `true` in the XML header for the output.
- **uploadToAttachment**: When true, the output XML will be placed directly into the attachment service. The attachment information will be provided in both the message's attachments section as well as `attachmentUrl` and `attachmentSize` will be populated. The attachment size will be described in bytes. When this value is false or not specified, the resulting XML will be provided in the `xmlString` field on the message.
- **cData**: A boolean indicating whether or not there is CDATA contained in the JSON object that should be ignored by the parser. False by default
- **docType**: Specify the system doc type by providing a link to a dtd file. `null` by default.
- **renderOpts**: An object containing 3 properties, `pretty`, `newline`, and `indent`. 
  - **pretty**: A boolean that is true by default. Pretty prints the XML output with indentation and new lines. 
  - **newline**: A string value to use for the new line character. Can only be used in conjunction with `pretty: true`. Defaults to `\n`. 
  - **indent**: A string value to use for the indentation/white space characters. Can only be used in conjunction with `pretty:true`. Defaults to `  `. 

## Attachment Storage Service Interaction

The url for the Attachment Storage Service will resolved with the following, in descending order of precedence:

- The `attachmentServiceUrl` value set on the flow step's field
- The environment variable `ELASTICIO_ATTACHMENT_STORAGE_SERVICE_BASE_URL`
- A default value of `http://attachment-storage-service.oih-prod-ns.svc.cluster.local:3002`

## Environment variables
* `MAX_FILE_SIZE`: *optional* - Controls the maximum size of an attachment to be written in MB.
Defaults to 10 MB where 1 MB = 1024 * 1024 bytes.


## Known limitations
 - The maximum size of incoming file for processing is 5 MB. If the size of incoming file will be more than 5 MB, the function will throw error `Attachment *.xml is to large to be processed by XML component. File limit is: 5242880 byte, file given was: * byte.`.
 - All actions involving attachments are not supported on local agents due to current platform limitations.
 - When creating XML files with invalid XML tags, the name of the potentially invalid tag will not be reported.

## License

Apache-2.0 © [elastic.io GmbH](https://elastic.io)
