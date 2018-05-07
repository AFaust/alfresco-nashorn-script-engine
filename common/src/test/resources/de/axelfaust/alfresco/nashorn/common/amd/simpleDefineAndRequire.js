'use strict';

(function()
{
    var testModule, anonModuleId;

    define('testModule', 'Test');

    testModule = require('testModule');
    if (testModule !== 'Test')
    {
        throw new Error('Expectation mismatch for "testModule" retrieved via require: ' + testModule);
    }

    anonModuleId = define(new Date());
    if (typeof anonModuleId !== 'string')
    {
        throw new Error('Module definition without explicit module ID should have been assigned an implicit ID');
    }

    testModule = require(anonModuleId);
    if (!(testModule instanceof Date))
    {
        throw new Error('Type expectation mismatch for anonymous module retrieved via require: ' + testModule);
    }
}());
