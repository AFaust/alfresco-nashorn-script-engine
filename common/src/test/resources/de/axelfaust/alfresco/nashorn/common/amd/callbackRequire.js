'use strict';

define('moduleWithNoDependencies', 'moduleWithNoDependencies-value');

define('moduleViaCommonJS', function(require, exports, module)
{
    exports.value = 'moduleViaCommonJS-value';
});

// test (string, function) for simple value module
require('moduleWithNoDependencies', function(moduleWithNoDependencies)
{
    if (moduleWithNoDependencies !== 'moduleWithNoDependencies-value')
    {
        throw new Error('Expectation mismatch for "moduleWithNoDependencies" retrieved via require: ' + moduleWithNoDependencies);
    }
});

// test (array, function) for simple value module
require([ 'moduleWithNoDependencies' ], function(moduleWithNoDependencies)
{
    if (moduleWithNoDependencies !== 'moduleWithNoDependencies-value')
    {
        throw new Error('Expectation mismatch for "moduleWithNoDependencies" retrieved via require: ' + moduleWithNoDependencies);
    }
});

// test (string, function) for complex value module
require('moduleViaCommonJS', function(moduleViaCommonJS)
{
    if (moduleViaCommonJS === undefined || moduleViaCommonJS === null || typeof moduleViaCommonJS !== 'object'
            || Object.prototype.toString.call(moduleViaCommonJS) !== '[object Object]')
    {
        throw new Error('Module "moduleViaCommonJS" should be a script object');
    }

    if (moduleViaCommonJS.value !== 'moduleViaCommonJS-value')
    {
        throw new Error('Expectation mismatch for "moduleViaCommonJS" retrieved via require: ' + moduleViaCommonJS);
    }
});

// test (array, function) for complex value module
require([ 'moduleViaCommonJS' ], function(moduleViaCommonJS)
{
    if (moduleViaCommonJS === undefined || moduleViaCommonJS === null || typeof moduleViaCommonJS !== 'object'
            || Object.prototype.toString.call(moduleViaCommonJS) !== '[object Object]')
    {
        throw new Error('Module "moduleViaCommonJS" should be a script object');
    }

    if (moduleViaCommonJS.value !== 'moduleViaCommonJS-value')
    {
        throw new Error('Expectation mismatch for "moduleViaCommonJS" retrieved via require: ' + moduleViaCommonJS);
    }
});

// test (array, function, function)
require([ 'moduleWithNoDependencies', 'moduleViaCommonJS', 'nonExistingModule' ], function(moduleWithNoDependencies, moduleViaCommonJS,
        nonExistingModule)
{
    throw new Error('Callback should not have been called as "nonExistingModule" is unresolvable');
}, function(resolvedModules, resolutionErrors)
{
    if (resolvedModules[0] !== 'moduleWithNoDependencies-value')
    {
        throw new Error('Expectation mismatch for "moduleWithNoDependencies" retrieved via require: ' + resolvedModules[0]);
    }

    if (resolvedModules[1].value !== 'moduleViaCommonJS-value')
    {
        throw new Error('Expectation mismatch for "moduleViaCommonJS" retrieved via require: ' + resolvedModules[1]);
    }

    if (resolvedModules[2] !== null)
    {
        throw new Error('Expectation mismatch for unresolvable "nonExistingModule" retrieved via require: ' + resolvedModules[2]);
    }

    if (resolutionErrors[0] !== null)
    {
        throw new Error('Unexpected resolution error recorded for "moduleWithNoDependencies"');
    }

    if (resolutionErrors[1] !== null)
    {
        throw new Error('Unexpected resolution error recorded for "moduleViaCommonJS"');
    }

    if (resolutionErrors[2] === null)
    {
        throw new Error('Missing resolution error for "nonExistingModule"');
    }
    else if (!(resolutionErrors[2] instanceof Java.type('de.axelfaust.alfresco.nashorn.common.amd.UnavailableModuleException')))
    {
        throw new Error('Incorrect resolution error type recorded for unresolvable "nonExistingModule"');
    }
});
