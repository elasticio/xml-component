
# xml-component
[![NPM version][npm-image]][npm-url]

## Description
This is an open source component for Converting XML to and from Json on elastic.io platform.
Component to be used on the elastic.io platform, which is able to convert XML to and from Json. 
### Purpose
This component has 3 actions allowing users to pass in either generic but well format XML/Json string or XML attachment and produces a generic string of the other file type. The output then can be maped and used in other components. 

### How it works. 
Before you can deploy any code into elastic.io you must be a registered elastic.io platform user. Please see our home page at http://www.elastic.io to learn how.

## Getting Started

After registration and uploading of your SSH Key you can proceed to deploy it into our system. At this stage we suggest you to:
* [Create a team](http://docs.elastic.io/docs/teams) to work on your new component. This is not required but will be automatically created using random naming by our system so we suggest you name your team accordingly.
* [Create a repository](http://docs.elastic.io/docs/component-repositories) where your new component is going to *reside* inside the team that you have just created.

Now as you have a team name and component repository name you can add a new git remote where code shall be pushed to. It is usually displayed on the empty repository page:

```bash
$ git remote add elasticio your-team@git.elastic.io:your-repository.git
```

Obviously the naming of your team and repository is entirely upto you and if you do not put any corresponding naming our system will auto generate it for you but the naming might not entirely correspond to your project requirements.
Now we are ready to push it:

```bash
$ git push elasticio master
```

### Requirements
#### Environment variables 
No environment variables need to be set.

## Actions

### XML to JSON
Takes well formatted XML string and converts it to generic Json object.
#### Input field
xml string: XML string to be converted. 

#### Schemas 
[input schema](lib/schemas/xmlToJson.in.json) \
[output schema](lib/schemas/xmlToJson.out.json)


### JSON to XML 
Takes the body of message passed into the component and converts to generic XML string 

#### Schemas 
[output schema](lib/  schemas/jsonToXml.out.json)

### XML Attachment to Json
Looks at the json array of attachments passed in to component and converts all XML found to generic Json object 

#### Input field
**Pattern to Match Files** - enter pattern for filtering files by name or leave this field empty for processing all incoming *.xml files.

#### Schemas
[output schema](ib/schemas/xmlToJson.out.json)

#### Known limitations
Action does not support local agents due to current platform limitations.
  
## <System> API and Documentation links (endpoints)
[Elastic.io attachment documentations](https://support.elastic.io/support/solutions/articles/14000057806-working-with-binary-data-attachments-) \
[Elastic.io attachment API documentations](https://api.elastic.io/v2/docs/#resources)

## License

Apache-2.0 © [elastic.io GmbH](https://elastic.io)
Icon made by Freepik from www.flaticon.com 

[npm-image]: https://badge.fury.io/js/xml-component.svg
[npm-url]: https://npmjs.org/package/xml-component
[travis-image]: https://travis-ci.org/elasticio/xml-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/xml-component
