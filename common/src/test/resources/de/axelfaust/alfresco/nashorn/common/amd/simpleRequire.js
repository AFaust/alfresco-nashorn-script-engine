'use strict';

(function()
{
    var testModule = require('testModule');

    if (testModule !== 'Test')
    {
        throw new Error('Expectation mismatch for "testModule" retrieved via require: ' + testModule);
    }
}());
