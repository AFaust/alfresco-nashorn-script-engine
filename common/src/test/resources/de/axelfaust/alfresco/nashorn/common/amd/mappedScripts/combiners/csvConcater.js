'use strict';

define(function(require, exports, module)
{
    exports.combine = function combine(a, b)
    {
        var result = a + ',' + b;
        return result;
    };
});
