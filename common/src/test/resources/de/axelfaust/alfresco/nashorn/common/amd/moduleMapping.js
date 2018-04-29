'use strict';

require.config({
    paths : {
        '*' : 'de/axelfaust/alfresco/nashorn/common/amd/mappedScripts'
    },
    map : {
        service : {
            combiner : 'combiners/csvConcater'
        },
        'service/s2' : {
            combiner : 'combiners/arrayConcater'
        }
    }
});

require('service/s1', function(service)
{
    var combinationResult = service.combine('a', '113', 'aa', '23');
    if (combinationResult !== 'a,113,aa,23')
    {
        throw new Error('Expectation mismatch for result of "service/s1#combine": ' + combinationResult);
    }
});

require('service/s2', function(service)
{
    var combinationResult = service.combine('a', '113', 'aa', '23');
    if (!Array.isArray(combinationResult) && combinationResult[0] !== 'a' && combinationResult[1] !== '113'
            && combinationResult[2] !== 'aa' && combinationResult[3] !== '23')
    {
        throw new Error('Expectation mismatch for result of "service/s2#combine": ' + combinationResult);
    }
});
