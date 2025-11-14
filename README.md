# XML Component [![CircleCI](https://circleci.com/gh/elasticio/xml-component.svg?style=svg)](https://circleci.com/gh/elasticio/xml-component)

## Description
An iPaaS component that converts data between XML and JSON formats.

### Purpose
This component converts XML attachments or strings to and from JSON. It exposes three actions that accept either well‑formed XML/JSON strings or XML attachments and returns the converted payload as a string or attachment. The result can be consumed by downstream components.

### Requirements and Conversion Behavior
- XML content supplied to the `XML to JSON` action must be [well-formed](https://en.wikipedia.org/wiki/Well-formed_document); invalid XML results in an error.
- JSON inputs must be objects with exactly one field, matching the single root element requirement for XML documents.
- [JSON inputs cannot contain field names that violate XML tag naming rules](https://www.w3schools.com/xml/xml_elements.asp):
  - They must start with a letter or underscore.
  - They cannot start with the letters `xml` (in any casing).
  - They may only contain letters, digits, hyphens, underscores, and periods.

XML attributes on a tag can be represented with an `_attr` object, and element text content can be set with the `_` key.

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

is equivalent to:
```xml
<someTag id="my id">my inner text</someTag>
```

#### Environment variables 
- `MAX_FILE_SIZE` (optional): Maximum attachment size, in bytes, that can be read or written. Defaults to 10 MB (`10 * 1024 * 1024` bytes).
- `EIO_REQUIRED_RAM_MB` (optional): Memory usage limit for the component. Defaults to 256 MB.

## Actions

### XML to JSON
Converts an XML string into a generic JSON object.

**Limitation:** Values inside XML tags are converted to strings. For example, given:
```xml
<note>
  <date>2015-09-01</date>
  <hour>08:30</hour>
  <to>Tove</to>
  <from>Jani</from>
  <body>Don't forget me this weekend!</body>
</note>
```

the output is:
```json
{
  "note": {
    "id": "322",
    "to": "Tove",
    "from": "Jani",
    "heading": "Reminder",
    "body": "Don't forget me this weekend!"
  }
}
```

### XML Attachment to JSON
#### Configuration Fields
- **Pattern** (string, optional): Regular expression used to filter attachments provided via the legacy attachment mechanism.
- **Upload single file** (checkbox, optional): Enable when the message contains a single attachment object.

#### Input Metadata
When **Upload single file** is enabled:
- **URL** (string, required): Link to the file, either public or internal (including steward/maester storage).

When **Upload single file** is disabled:
- **Attachments** (array, required): Collection of attachment objects.
  - **URL** (string, required): Link to the file on the internet or the platform.

If you plan to use this option with static data, switch to Developer mode.
<details><summary>Sample</summary>
<p>

```json
{
  "attachments": [
    {
      "url": "https://example.com/files/file1.xml"
    },
    {
      "url": "https://example.com/files/file2.xml"
    }
  ]
}
```
</p>
</details>

#### Output Metadata
A JSON object built from the parsed XML.

### JSON to XML 
Accepts a JSONata expression that must resolve to an object, then converts it to XML. See [Requirements and Conversion Behavior](#requirements-and-conversion-behavior) for more detail.

Options:
- **Upload XML as file to attachments**: When enabled, the resulting XML is stored as an attachment. `attachmentUrl` and `attachmentSize` are provided in the body and the message attachments.
- **Exclude XML Header/Description**: When enabled, the XML declaration (`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`) is omitted.
- **Is the XML file standalone**: Controls the `standalone` attribute in the XML declaration (`yes` or `no`). Ignored when the header is excluded.

Incoming messages must contain a single `input` field. In integrator mode this appears as **JSON to convert**. In developer mode, set the `input` property manually. Example:
```
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

## Known limitations
- Actions working with attachments are not supported on local agents due to current platform constraints.
- When creating XML files with invalid XML tags, the invalid tag name is not reported.
- If an attachment used for sampling in `XML Attachment to JSON` exceeds 500 KB, a smaller sample with the same structure is generated.

## Additional Info
Icon made by Freepik from www.flaticon.com.

## License

Apache-2.0 © [elastic.io GmbH](https://elastic.io)
