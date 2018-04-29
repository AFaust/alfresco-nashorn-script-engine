'use strict';

define([ 'combiner' ], function(combiner)
{
    var module = {
        combine : function combine()
        {
            var idx, result;

            if (arguments.length >= 1)
            {
                result = arguments[0];
            }

            if (arguments.length > 1)
            {
                for (idx = 1; idx < arguments.length; idx++)
                {
                    result = combiner.combine(result, arguments[idx]);
                }
            }

            return result;
        }
    };

    Object.freeze(module);
    return module;
});
