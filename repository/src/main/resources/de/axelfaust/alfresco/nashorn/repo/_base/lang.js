/* globals -require */
define([ 'nashorn!Java' ], function _base_lang__root(Java)
{
    'use strict';
    var module;

    /**
     * This module provides a collection of common script engine utilities so they don't need to be repeated.
     * 
     * @module _base/lang
     * @requires module:nashorn!Java
     * @author Axel Faust
     */
    module = {

        /**
         * Checks if a specific value is an object (null is NOT considered to be an object).
         * 
         * @instance
         * @memberOf module:_base/lang
         * @param {object}
         *            o - the object to check
         * @param {boolean}
         *            [nativeOnly] - if a check for a native script object should be performend
         * @param {boolean}
         *            [pure] - if a check for a "pure" native script object should be performend (a "pure" is using only the Object
         *            prototype)
         * @returns {boolean} true if the object is an object, false otherwise
         */
        isObject : function _base_lang__isObject(o, nativeOnly, pure)
        {
            var result = o !== undefined && o !== null && typeof o === 'object';

            if (nativeOnly === true)
            {
                result = result && Java.isScriptObject(o);
            }

            if (pure === true)
            {
                result = result && Object.prototype.toString.call(o) === '[object Object]';
            }

            return result;
        },

        /**
         * Checks if a specific value is a function.
         * 
         * @instance
         * @memberOf module:_base/lang
         * @param {function}
         *            f - the function to check
         * @param {boolean}
         *            [nativeOnly] - if a check for a native function should be performed
         * @returns {boolean} true if the object is a function, false otherwise
         */
        isFunction : function _base_lang__isFunction(f, nativeOnly)
        {
            var result = typeof f === 'function';

            if (nativeOnly === true)
            {
                result = result && Java.isScriptFunction(f);
            }

            return result;
        }
    };

    Object.freeze(module);

    return module;
});