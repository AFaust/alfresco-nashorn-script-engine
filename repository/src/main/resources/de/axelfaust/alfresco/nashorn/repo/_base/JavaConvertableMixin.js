/* globals -require */
define([ '_base/declare' ], function _base_JavaConvertableMixin_root(declare)
{
    'use strict';
    return declare([], {

        _internalJavaValueProperty : null,

        getJavaValue : function _base_JavaConvertableMixin__getJavaValue()
        {
            var result;
            if (typeof this._internalJavaValueProperty === 'string' || typeof this._internalJavaValueProperty === 'number')
            {
                result = this[this._internalJavaValueProperty];
            }

            return result;
        }

    });
});