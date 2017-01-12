# xml-component [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
> Integration component to work with XML fiels

# xml-component
XML component for the [elastic.io platform](http://www.elastic.io &#34;elastic.io platform&#34;)

If you plan to **deploy it into [elastic.io platform](http://www.elastic.io &#34;elastic.io platform&#34;) you must follow sets of instructions to succseed**. 

## Before you Begin

Before you can deploy any code into elastic.io **you must be a registered elastic.io platform user**. Please see our home page at [http://www.elastic.io](http://www.elastic.io) to learn how. 

We&#39;ll use git and SSH public key authentication to upload your component code, therefore you must **[upload your SSH Key](http://docs.elastic.io/docs/ssh-key)**. 

&gt; If you fail to upload you SSH Key you will get **permission denied** error during the deployment.

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

## How to use

### Parse XML with XSD Schema
Given action will parse XML that is created according to XML Schema, you would need to supply
URI of XML Schema. XML Schema URI may include HTTP Basic parameters (username/password) via standard URI
 `chema like ``https://username:password@foo.bar.com/schema.xsd``.

XML Payload is expected via input variable in the message (you would need to supply full XML payload). If 
input message payload is empty then component will try to parse all attachments of incoming message.

#### Known limitations
* Currently a single XML Schema is supported
* Schema validation is not enabled when parsed from XML 

## License

Apache-2.0 © [elastic.io GmbH](https://elastic.io)
Icon made by Freepik from www.flaticon.com 

[npm-image]: https://badge.fury.io/js/xml-component.svg
[npm-url]: https://npmjs.org/package/xml-component
[travis-image]: https://travis-ci.org/elasticio/xml-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/xml-component
