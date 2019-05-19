# Sails-JSON-API

Developed with the goal of seamlessly integrating [Ember.js](https://www.emberjs.com/) front-end applications with [SailsJS](https://sailsjs.com/) back-ends, Sail-JSON-API overrides default blueprints to provide a more robust communication interface. Sails-JSON-API provides [JSON API](http://jsonapi.org/) compliant actions, controllers, helpers, policies, and responses for Sails v1.0+ which are immediately available after installation.

As of v0.3.0, Sails-JSON-API has now begun its stable push towards a 1.0 release. If you're using this library in your project, please provide issues and feedback!

## Getting Started

As this library is a sails hook, your Sails app will become JSON API compliant after installation.

````bash
npm install --save sails-json-api
````

### Configuration (Required)

Configure Sails to use pluralized routes

```javascript
// config/blueprints.js
module.exports.blueprints = {
  pluralize: true
}
```

Configure Sails to add an upper limit to the find and populate actions

```javascript
// config/blueprints.js
module.exports.blueprints = {
  parseBlueprintOptions: function(req) {
    // Get the default query options.
    const queryOptions = req._sails.hooks.blueprints.parseBlueprintOptions(req);

    // If this is the "find" or "populate" blueprint action, and the normal query options
    // indicate that the request is attempting to set an exceedingly high `limit` clause,
    // then prevent it (we'll say `limit` must not exceed 100).
    if (req.options.blueprintAction === 'find' || req.options.blueprintAction === 'populate') {
      if (queryOptions.criteria.limit > 100) {
        queryOptions.criteria.limit = 100;
      }
    }

    return queryOptions;
  }
}
```

Configure add fetch to update, destroy, and create

```javascript
// config/models.js
module.exports.blueprints = {
  fetchRecordsOnUpdate: true,
  fetchRecordsOnDestroy: true,
  fetchRecordsOnCreate: true,
  fetchRecordsOnCreateEach: true
}
```

### Configuration (Optional)

In config/blueprints.js you can configure a prefix for link relationships. You will need to configure this setting if you will be running your Sails server behind another server like Apache with redirect routing. This prefix should match the URL route that Apache would forward to your sails server port.

```javascript
// config/blueprints.js
module.exports.blueprints = {
  linkPrefix: '/redirectedPath'
}
```

To support the 'fields' query param, which is implemented by the Sails.js criteria 'select', a schema at the model level must be defined. This can be done globally in config/models.js or individually in each Model file.

```javascript
// config/models.js
module.exports.models = {
  schema: true
}
```

### Implementation

After installation and configuration you will immediately have access to JSON API custom actions, helpers, responses, policies, and a controller. Additionally a global 'JSONAPISerializer' will provide direct access to the underlying serializer used by the hook.

#### Blueprint Actions

These actions will be available on the sails object via `sails.getActions()` for manual implementation

* create
* find
* findone
* destroy
* update
* populate

#### Helpers

The following will be available as any other helper via `sails.helpers` object

* buildJsonApiResponse (synchronous)

  ```javascript
  sails.helpers.buildJsonApiResponse.with({
    model: Author, // Sails model class
    records: results.records, // Array of records returned from a waterline query to be serialized
    meta: Object.assign({ total: results.count }, meta) // optionally add top-level meta to add to the response
  });
  ```

* countRelationship (asynchronous)

  ```javascript
  sails.helpers.countRelationship
    .with({
      model: Author, // Sails model class
      association: { alias: 'articles' }, // Definition of the association to count (can be found using sails.helpers.getAssociationConfig)
      pk: recordId // Primary key of the record to count the relationship of
    })
    .then(result => done(null, result)); // Handle the promise returned with a numerical result
  ```

* generateResourceLink (synchronous)

  ```javascript
  sails.helpers.generateResourceLink.with({
    modelPlural: 'authors', // The resource's (model) name pluralized
    linkSuffix: 'link/suffix/sample' // Optionally add a link suffix to be appended
  });
  ```

* getAssociationConfig

  ```javascript
  sails.helpers.getAssociationConfig.with({
    model: Author // Sails model class
    include: ['articles', 'comments'] // An array of relationship paths which define which associations will be included as records
  });
  ```

* jsonifyError

  ```javascript
  const error = new Error('A sample error');
  sails.helpers.jsonifyError.with({
    err: error, // An array of error objects or an individual error object to JSON-ify to the JSON API spec
    title: 'An error' // A title to apply to each error
  }));
  ```

* linkAssociations (synchronous)

  ```javascript
  sails.helpers.linkAssociations.with({
    model: Author, // Sails model class
    records: results.records // A record or an array of records returned from a Waterline query
  });
  ```

* negotiate (synchronous)

  ```javascript
  sails.helpers.negotiate.with({
    res, // Sails response object
    err // An error to identify as a either an unprocessableEntity or a serverError
  });
  ```

* parseFields (synchronous)

  ```javascript
  sails.helpers.parseFields.with({
    req, // Sails request object
    model: Model, // A Waterline collection object
    toInclude // An array of relationships to include (optional)
  });
  ```

* parseInclude (synchronous)

  ```javascript
  sails.helpers.parseInclude.with({
    req, // Sails request object
    model: Model // A Waterline collection object
  });
  ```

* populateRecords (synchronous)

  ```javascript
  const query = Model.find()
    .where({ name: 'Bob' })
    .skip(2)
    .sort('age DESC');

  // populate associations according to our model specific configuration...
  sails.helpers.populateRecords.with({
    query,
    associations: [{ include: 'record' alias: 'articles' }],
    force: false,
    subCriteria: { genre: { contains: 'Fiction' }}
  }).exec(cb);
  ```

#### Responses

This hook automatically wraps the built-in responses with JSON API specific equivalents. If the Content-Type header of the res object is `application/vnd.api+json` a JSON API compliant response will be returned, otherwise the standard Sails response is used. Additionally, the following responses can be manually called via the `res` object:

* badRequestJsonApi (400)
* created (201)
* forbiddenJsonApi (403)
* noContent (204)
* notAccessible (406)
* notFoundJsonApi (404)
* serverErrorJsonApi (500)
* unprocessableEntity (411)
* unsupportedMediaType  (415)

#### Policies

This hook provides additional policies to implement the JSON API spec to its strictest form

* jsonApiValidateHeaders - Requires that both the request `Content-Type` and `Accept` headers are set to `application/vnd.api+json`

#### Controller

Arguably the most important component provided by sails-json-api. It exports a class constructor that will handle all blueprint actions for any model type by default; these actions are defined above.

To create a new sails-json-api controller instance, simply define your controller file as follows:
```javascript
const Controller = new sails.hooks['sails-json-api'].controller({});

export default Controller;
```

To create a new sails-json-api controller instance *when the `sails` global is not available*:
```javascript
import { controller } from 'sails-json-api';

const Controller = controller({});

export default Controller;
```

Default actions can be overwritten and custom actions can be added:

```javascript
const Controller = new sails.hooks['sails-json-api'].controller({
  create(req, res) {
    //...some special creation code
    const jsonApiBody = sails.helpers.buildJsonApiResponse.with({ model: Author, records: authorRecords })

    return res.created(jsonApiBody);
  },
  customAction(req, res) {
    // some custom code
    // Set the content-type header
    res.setHeader('Content-Type', 'application/vnd.api+json');

    return res.ok();
  }
});

export default Controller;
```

Sails-json-api controllers also offer a powerful new feature that does not exist anywhere else in the sails ecosystem: `interrupts`. This is a concept directly inherited from [Sails-Ember-Rest](https://github.com/mdconaway/sails-ember-rest).

At a high level, an interrupt can be though of as a policy, or function that you can execute *after* the action itself has occurred but *before* a response is sent to the client. Whatever function you register as an interrupt will also be handed all of the important data generated in the action itself as its input parameters. The best way to demonstrate the utility of the interruptor paradigm is through example:

```javascript
const myController = new sails.hooks['sails-json-api'].controller({});

myController.setServiceInterrupt('create', function(req, res, next, Model, record) {
    // req, res, next - are all the express equivalent functions for a middleware. MAKE SURE YOU CALL NEXT WHEN YOU ARE DONE!
    // Model - is the parsed model class that represents the base resource used in this action
    // record - is the new record instance that has been successfully persisted to the database as this is a create action
    Logger.create(Model, record, (err) => {
        if(err) {
            return res.serverError(err);
        }
        Session.addRecordToMyManagedObjects(req.session, Model.identity, record, next);
    });
});

// If you wanted to gain access to the interruption object, for some low-level use in your own actions, you can call the following function:
// myController.getInterrupts();
//^ This will return all possible interrupts synchronously in a hash object

export default myController;
```

The above example could automatically create "tracking" objects through some kind of Logger service that would help maintain history about some important source object, and it could also add any new created objects of this type directly into a user's existing session profile (through some service called Session) to enable them to access/edit it for the remainder of their session.  What is really powerful about this paradigm is that it enables you to bolt on *post-action* code to any sails-json-api action, without altering the battle-tested action itself. An interrupt is like a policy that can be run after instead of before all of the asynchronous database interaction, but is more powerful than model life-cycle hooks because it will also have access to the request and response objects that are critical to the context of the logic that is occurring.

The following interrupts are available for your bolt-on code by default:

*find
*findone
*populate
*create
*beforeUpdate
*afterUpdate
*destroy

In each case, the `record` parameter will be the record or records that were found/created/destroyed.

In the case of the `beforeUpdate` interrupt, the `record` parameter will be an object containing all the values the user sent to apply against the target record.

In the case of the `afterUpdate` interrupt, the `record` parameter will be an object with a `before` and `after` state of the updated record.

```javascript
//The object representation of the "record" parameter for the update interrupt:
{
  before: oldRecordInstance,
  after: newRecordInstance
}
```

You don't have to use interrupts in your code, but as the demands on your server grow you may find them to be incredibly useful for making your code more DRY and less error-prone, as well as providing a whole new life-cycle type to the sails ecosystem.

### Installing

npm install --save sails-json-api

## Running the tests

npm test

# Roadmap

* JSON API implementation
  * [X] GET all resources
  * [X] GET one resource
  * [X] POST resource
  * [X] DELETE resource
  * [X] PATCH resource
  * Relationships
    * [X] One to one
    * [X] One way associations
    * [X] Many to many
    * [X] One to many
    * [X] Through relationships
  * Update relationships via [relationship links](https://jsonapi.org/format/#crud-updating-relationships)
    * [ ] To-One Relationships
    * [ ] To-Many Relationships
  * [X] Sparse Fields
  * [X] Sorting
  * [X] Pagination
  * [X] Filtering
  * Special param 'include' [Fetching Includes](https://jsonapi.org/format/#fetching-includes)
    * [X] Include top level relationships
    * [ ] Include nested relationships denoted with dot-notation
  * Return proper error if any [Server Responsibilities](https://jsonapi.org/format/#content-negotiation-servers)
    * [X] 406 Not Acceptable
    * [ ] 409 Conflict
    * [X] 415 Unsupported Media Type
  * Allow [client generated IDs](https://jsonapi.org/format/#crud-creating-client-ids)
    * [ ] Return '204 No Content' upon a successful creation
    * [ ] Return '409 Conflict' when attempted to create a resource with an ID that already exists
  * [ ] Custom non-dynamic, metadata applied to each response
  * [ ] Location header upon successful resource [creation](https://jsonapi.org/format/#crud-creating-responses)
* Sails integration
  * [X] Pubsub integration
  * [X] Provide a helper to serialize as JSON API for custom endpoints
  * [ ] Enable configuration for blacklisting / whitelisting fields for projection queries
  * [ ] Additional configuration options (to be expanded)
  * [ ] Support asynchronous actions that could take awhile to process (202 Accepted)

## Contributing

Please read [CONTRIBUTING.md](https://github.com/ajgribble/sails-json-api/blob/develop/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

* **Adam Gribble**

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

THIS PACKAGE DERIVES THE MAJORITY OF ITS ORIGINAL IDEAS AND CODE FROM THE FOLLOWING LIBRARY: [Sails-Ember-REST](https://github.com/mdconaway/sails-ember-rest)

Sails-JSON-API is a port of the popular [Sails-Ember-Rest](https://github.com/mdconaway/sails-ember-rest) library that directly supports the Ember Data REST-Adapter. Although the REST-envelope style format is perfectly supported, Ember.js prefers the more expressive [JSON API](http://jsonapi.org/) standard.
