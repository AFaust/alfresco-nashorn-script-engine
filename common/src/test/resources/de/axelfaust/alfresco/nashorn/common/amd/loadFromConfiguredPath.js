'use strict';

require.config({
    paths : {
        '*' : 'de/axelfaust/alfresco/nashorn/common/amd/configuredScripts',
        'custom/n' : [ 'de/axelfaust/alfresco/nashorn/common/amd/configuredN1Scripts',
                'de/axelfaust/alfresco/nashorn/common/amd/configuredN2Scripts' ]
    }
});

require('custom/test', function(testModule)
{
    if (testModule !== 'customScripts - Test')
    {
        throw new Error('Expectation mismatch for "custom/test" retrieved via require: ' + testModule);
    }
});

require('custom/n/test1', function(testModule)
{
    if (testModule !== 'customN1Scripts - Test')
    {
        throw new Error('Expectation mismatch for "custom/n/test1" retrieved via require: ' + testModule);
    }
});

require('custom/n/test2', function(testModule)
{
    if (testModule !== 'customN2Scripts - Test')
    {
        throw new Error('Expectation mismatch for "custom/n/test2" retrieved via require: ' + testModule);
    }
});
