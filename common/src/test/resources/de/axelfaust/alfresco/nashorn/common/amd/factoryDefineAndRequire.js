'use strict';

(function()
{
    var globalRequire, testModuleViaCommonJS, moduleWithNoDependencies, anonModuleId, anonModuleWithNoDependencies;

    globalRequire = require;

    define('moduleViaCommonJS', function(require, exports, module)
    {
        if (typeof require !== 'function')
        {
            throw new Error('Default dependency "require" should be a function');
        }

        if (require === globalRequire)
        {
            throw new Error('Default dependency "require" should be different from the global "require" module');
        }

        if (exports === undefined || exports === null || typeof exports !== 'object'
                || Object.prototype.toString.call(exports) !== '[object Object]')
        {
            throw new Error('Default dependency "exports" should be a script object');
        }

        if (Object.getOwnPropertyNames(exports).length !== 0)
        {
            throw new Error('Default dependency "exports" should be an empty script objectr');
        }

        if (module === undefined || module === null || typeof module !== 'object'
                || Object.prototype.toString.call(module) !== '[object Object]')
        {
            throw new Error('Default dependency "module" should be a script object');
        }

        if (module.id !== 'moduleViaCommonJS')
        {
            throw new Error('Value of "module.id" does not match module ID');
        }

        if (module.url === undefined || module.url === null
                || !/de\/axelfaust\/alfresco\/nashorn\/common\/amd\/factoryDefineAndRequire.js$/.test(module.url))
        {
            throw new Error('Value of "module.url" does not match script URL');
        }

        if (module.exports !== exports)
        {
            throw new Error('Value of "module.exports" does not match "exports"');
        }

        exports.value = 'moduleViaCommonJS-value';
    });

    define('moduleWithNoDependencies', [], function()
    {
        return 'moduleWithNoDependencies-value';
    });

    anonModuleId = define([], function()
    {
        return 'anonModuleWithNoDependencies-value';
    });
    if (typeof anonModuleId !== 'string')
    {
        throw new Error('Module definition without explicit module ID should have been assigned an implicit ID');
    }

    testModuleViaCommonJS = require('moduleViaCommonJS');
    if (testModuleViaCommonJS.value !== 'moduleViaCommonJS-value')
    {
        throw new Error('Expectation mismatch for "moduleViaCommonJS.value" retrieved via require: ' + testModuleViaCommonJS);
    }

    moduleWithNoDependencies = require('moduleWithNoDependencies');
    if (moduleWithNoDependencies !== 'moduleWithNoDependencies-value')
    {
        throw new Error('Expectation mismatch for "moduleWithNoDependencies" retrieved via require: ' + moduleWithNoDependencies);
    }

    anonModuleWithNoDependencies = require(anonModuleId);
    if (anonModuleWithNoDependencies !== 'anonModuleWithNoDependencies-value')
    {
        throw new Error('Expectation mismatch for "anonModuleWithNoDependencies" retrieved via require: ' + anonModuleWithNoDependencies);
    }
}());
