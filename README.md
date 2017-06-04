Sails-Ember-Rest
======================

# VERSIONS

The following versions of this library are designed for the listed versions of sails.js:

* Version 0.x.x - Sails.js ^0.11.x
* Version 1.x.x - Sails.js ^1.x.x

- The Version 1.x.x series of this library is under active testing and development. If you find a bug, please open an issue or make a pull request!

- Version 1.0.6 and above of sails-ember-rest should be fully Sails 1.0.0 compliant.

# Summary

Ember Data REST-Adapter compatible controllers, policies, services and generators for Sails v0.12+

THIS PACKAGE DERIVES THE MAJORITY OF ITS ORIGINAL IDEAS AND CODE FROM THE FOLLOWING LIBRARY: [Sails-Generate-Ember-Blueprints](https://github.com/mphasize/sails-generate-ember-blueprints)

[Sails](http://www.sailsjs.org/) 1.0+ is moving away from blueprints that override the default sails CRUD blueprints.

To continue supporting the Ember-Data REST Adapter with sails 1.0+ applications, application controllers must be created and extended in an object-oriented way.

Sails-Ember-Rest is a port of the popular [Sails-Generate-Ember-Blueprints](https://github.com/mphasize/sails-generate-ember-blueprints) library that aims to bring this REST/envelope data convention up to the sails 1.0+ standard, while adding a few new features along the way.

If you're looking for something that makes Ember work with the standard Sails API, take a look at [ember-data-sails-adapter](https://github.com/bmac/ember-data-sails-adapter) and the alternatives discussed there.

# Whats Included

This package ships as a standard node module that will export all of its assets if a user simply uses `require('sails-ember-rest');`.

From this require statement the following classes/objects will be available:

**controller**

(TO BE DOCUMENTED, WORK COMPLETED)

**service**

(TO BE DOCUMENTED, WORK COMPLETED)

**policies**

(TO BE DOCUMENTED, WORK COMPLETED)

**responses**

(TO BE DOCUMENTED, WORK COMPLETED)

**util**

(TO BE DOCUMENTED, WORK COMPLETED)

If you are using es6, you can import these elements and inspect them using the following code:

```javascript
import { controller, service, policies, responses, util } from 'sails-ember-rest';
```

* controller and policies subelements are class constructors
* service, response, and util are singleton objects / functions

sails-ember-rest will also install 3 sails generators to make scaffolding out your application easier:

`sails generate ember-rest controller <name of controller>`

`sails generate ember-rest responses`

and

`sails generate ember-rest policies`

The controller generator creates a singleton instance of the ember-rest controller, and custom actions can be added by simply binding new properties to the singleton, or passing an instance extension object into the class constructor.  Future work will include improving extension functionality.

The response generator adds the required "create" response if it does not yet exist.

The policy generator creates a set of helper policies that can allow a sails application to run "virtual" controllers on top of specific actions when conditions needed.  This allows an application to have a set of default base application controllers (like graphQL controllers, or JSON API controllers), but still run an Ember REST compatible controller when policies determine this is what a client needs.  Think of it as a way to layer several controllers over an identical route, giving your server the ability to serve several frontend client adapters at the same URL.

# New Features

* Link Prefixes for linked data (Needed if you mount your sails.js server at a sub-route of your base domain)
* Virtual Controller Policies
* Callback based Controller interrupts for performing more complicated server lifecycle actions that may require access to the `req` and `res` objects. This can be viewed as model lifecycle hooks on steriods.
* Cleaner import statements in generated controllers, policies and services.

# Getting started

* Install the library and generators into your (new) Sails project `npm install sails-ember-rest`
* Add this generator to your .sailsrc file:
```javascript
{
  "generators": {
    "modules": {
        "ember-rest": "sails-ember-rest"
    }
  }
}
```
* Run the generator: 
* `sails generate ember-rest controller <name>`
* `sails generate ember-rest policies`
* Go through ALL configuration steps below, and then...
* Generate some models for your controllers, e.g. `sails generate model user`
* Start your app with `sails lift`

Now you should be up and running and your Ember Data app should be able to talk to your Sails backend.

### Configuration

* Configure sails to use **pluralized** blueprint routes.
* Add a default limit to the blueprint config (Sails ^1.0)
* You can use parseBlueprintOptions instead of defaultLimit in Sails ^1.0

In `myproject/config/blueprints.js` set `pluralize: true`

```javascript
module.exports.blueprints = {
    // ...
    pluralize: true,
    defaultLimit: 100
};
```

* Add a configuration option `associations: { list: "link", detail: "record" }`
 to `myproject/config/models.js`. This will determine the default behaviour.
* Also add fetch on create/update/delete to this config (Sails ^1.0)

```javascript
module.exports.models = {
    // ...
    associations: {
        list: "link",
        detail: "record"
    },
    fetchRecordsOnUpdate: true,
    fetchRecordsOnDestroy: true,
    fetchRecordsOnCreate: true,
    fetchRecordsOnCreateEach: true
};
 ```

* Add a configuration option `validations: { ignoreProperties: [ 'includeIn' ] }`
to `myproject/config/models.js`. This tells Sails to ignore our individual configuration on a model's attributes.

```javascript
module.exports.models = {
    // ...
    validations: {
        ignoreProperties: ['includeIn']
    }
};
```

* (Optional) Setup individual presentation on a by-model by-attribute basis by adding `includeIn: { list: "option", detail: "option"}` where option is one of `link`, `index`, `record`.

```javascript
attributes: {
    name : {
        type: "string"
    },
    posts: {
        collection: "post",
        via: "user",
        includeIn: {
            list: "record",
            detail: "record"
        }
    }
}
```

**Presentation options:**  
The `link` setting will generate jsonapi.org URL style `links` properties on the records, which Ember Data can consume and load lazily.

The `index` setting will generate an array of ID references for Ember Data, so be loaded as necessary.

The `record` setting will sideload the complete record.


### Troubleshooting

If the generator exits with
`Something else already exists at ... ` you can try running it with the `--force` option (at your own risk!)

Some records from relations/associations are missing? Sails has a default limit of 30 records per relation when populating. Try increasing the limit as a work-around until a pagination solution exists.

### Ember RESTAdapter

If you're using [Ember CLI](//ember-cli.com), you only need to setup the RESTAdapter as the application adapter.
( You can also use it for specific models only. )

In your Ember project: app/adapters/application.js

```javascript
export default DS.RESTAdapter.extend({
    coalesceFindRequests: true,   // these blueprints support coalescing (reduces the amount of requests)
    namespace: '/',               // same as API prefix in Sails config
    host: 'http://localhost:1337' // Sails server
});
```

* Please note that in Sails 1.0, record updates should be made through PATCH requests, not PUT requests. You can modify the http verb used by the Ember RESTAdapter used during updates to avoid getting deprecation warnings in the Sails 1.0 console.


### Create with current user

If you have logged in users and you always want to associate newly created records with the current user, take a look at the Policy described here: [beforeCreate policy](https://gist.github.com/mphasize/a69d86b9722ea464deca)

### More access control

If you need more control over inclusion and exclusion of records in the blueprints or you want to do other funny things, quite often a Policy can help you achieve this without a need for modifying the blueprints. Here's an example of a Policy that adds *beforeFind*, *beforeDestroy*, etc... hooks to a model: [beforeBlueprint policy](https://gist.github.com/mphasize/e9ed62f9d139d2152445)


### Accessing the REST interface without Ember Data

If you want to access the REST routes with your own client or a tool like [Postman](http://www.getpostman.com/) you may have to set the correct HTTP headers:

    Accept: application/json
    Content-Type: application/json

Furthermore Ember Data expects the JSON responses from the API to follow certain conventions.
Some of these conventions are mentioned in the [Ember model guide](http://emberjs.com/guides/models/connecting-to-an-http-server/).
However, there is a more [complete list of expected responses](https://stackoverflow.com/questions/14922623/what-is-the-complete-list-of-expected-json-responses-for-ds-restadapter) on Stackoverflow.

As a **quick example**, if you create a `post` model under the namespace `api/v1` you can access the model under `localhost:1337/api/v1/posts` and to create a new Record send a POST request using the following JSON:

```javascript
{
  "post": {
    "title": "A new post"
    "content": "This is the wonderful content of this new post."
  }
}
```


# Todo

### Refactor into ES6

- Because it's 2017!

### Generator: Improve installation

- setup configuration while running the generator

### Blueprints: Support pagination metadata

- the controller supports pagination meta data on direct requests. However, sideloaded records from relationships are currently not paginated.

### Testing: Make all the things testable

I am still working out how to make this repo more maintainable and testable.

# Scope

The controllers and policies in this repository should provide a starting point for a Sails backend that works with an Ember frontend app. However, there are a lot of things missing that would be needed for a full blown app (like authentication and access control) but these things don't really fit into the scope of this sails add-on.

# Sane Stack

@artificialio used these an earlier version of this code (sails-generate-ember-blueprints) to create the first version of their Docker-based [Sane Stack](http://sanestack.com/).


# Questions, Comments, Concerns?

Open an issue! I'd love to get some help maintaining this library.

- Michael Conaway (2017)