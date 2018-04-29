'use strict';

define(function(require, exports, module)
{
    exports.combine = function combine(a, b)
    {
        var result;

        if (Array.isArray(a))
        {
            if (Array.isArray(b))
            {
                result = a.concat(b);
            }
            else
            {
                result = a.concat([ b ]);
            }
        }
        else if (Array.isArray(b))
        {
            result = [ a ].concat(b);
        }
        else
        {
            result = [ a, b ];
        }

        return result;
    };
});
