/* globals -require */
define([ '_base/declare' ], function _base_JavaConvertableMixin_root(declare)
{
    'use strict';
    return declare([], {

        internalJavaValueProperty : null,

        getJavaValue : function _base_JavaConvertableMixin__getJavaValue()
        {
            var result;
            if (typeof this.internalJavaValueProperty === 'string' || typeof this.internalJavaValueProperty === 'number')
            {
                result = this[this.internalJavaValueProperty];
            }

            return result;
        }

    });
});