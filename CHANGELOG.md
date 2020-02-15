# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2020-02-15
### Changed
- Bumped dev dependencies
- Updated (major) json-api-serializer dependency to v2.3.0
- Updated (major) pluralize dependency to v8.0.0
- Patched lodash to v4.17.15

## [0.3.1] - 2019-05-19
### Changed
- Patched errors in certain scenarios which became deeply nested

## [0.3.0] - 2019-05-07
### Changed
- Updated test environment to use Sails 1.2.1 and Babel 7
- Updated JSON API Serializer to newest version (1.15.1)

## [0.2.0] - 2018-09-15
### Changed
- Added support for JSON API's 'fields' query param for sparse fields
- Added Travis-CI configuration

## [0.0.1] - 2018-06-23
### Changed
- Forked project from https://github.com/mdconaway/sails-ember-rest
- Implemented 3rd party json-api-serializer for the heavy lifting
- Added partial support for JSON API's 'include' query param
- Ported the module to a Sails Hook from a Sails Generator

## [0.2.0] - 2018-08-04
- Implemented the sparse fieldset concept from JSON API