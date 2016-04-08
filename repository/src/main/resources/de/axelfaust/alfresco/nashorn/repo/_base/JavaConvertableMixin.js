/**
 * This module provides a basic API for object instances that can be converted into a (raw) Java value which should be exposed to any
 * processing after script execution or service APIs instead of the script object instance.
 * 
 * @module _base/JavaConvertableMixin
 * @author Axel Faust
 */
/* globals -require */
define([ '_base/declare' ], function _base_JavaConvertableMixin_root(declare)
{
    'use strict';
    return declare([], {

        /**
         * The name of a property referencing the (raw) Java object. This will be used to determine the object to be returned by
         * {@link module:_base/JavaConvertableMixin~getJavaValue} when that function has not been overriden.
         * 
         * @instance
         * @protected
         * @type {string}
         */
        _internalJavaValueProperty : null,

        /**
         * Retrieves the (raw) Java object / value to be used instead of this script object instance when passed / exposed to any processing
         * after script execution or service APIs.
         * 
         * @instance
         * @returns {object} the (raw) Java object
         */
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