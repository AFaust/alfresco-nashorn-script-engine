/* globals -require */
define('globalProperties', [ 'spring!global-properties', 'nashorn!Java' ], function globalProperties_loader(globalProperties, Java)
{
    'use strict';
    var loader, cache, isObject, clone, loadProperty, getProperty;

    cache = {};

    isObject = function globalProperties_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    clone = function globalProperties_loader__clone(obj)
    {
        var result, desc;

        if (obj === undefined || obj === null)
        {
            result = obj;
        }
        else if (Array.isArray(obj))
        {
            result = [];
            obj.forEach(function globalProperties_loader__clone_arrElement(element)
            {
                result.push(clone(element));
            }, this);
        }
        else if (isObject(obj))
        {
            result = {};
            Object.getOwnPropertyNames(obj).forEach(function globalProperties_loader__clone_objKey(key)
            {
                desc = Object.getOwnPropertyDescriptor(obj, key);
                Object.defineProperty(result, key, {
                    value : clone(obj[key]),
                    writable : desc.writable,
                    configurable : desc.configurable,
                    enumerable : desc.enumerable
                });
            }, this);
        }
        else
        {
            // assume simple / literal values
            result = obj;
        }

        return result;
    };

    loadProperty = function globalProperties_loader__loadProperty(id)
    {
        var idFragments, key, keyPrefix, propertyNames, idx, properties, result;

        idFragments = id.split(/[\/\.]/);
        if (idFragments[idFragments.length - 1] === '*')
        {
            // load object of all key=>value for specific key prefix
            keyPrefix = idFragments.slice(0, idFragments.length - 1).join('.') + '.';
            propertyNames = Java.from(globalProperties.stringPropertyNames());

            properties = {};
            for (idx = 0; idx < propertyNames.length; idx += 1)
            {
                if (propertyNames[idx].indexOf(keyPrefix) === 0)
                {
                    properties[propertyNames[idx]] = globalProperties.getProperty(propertyNames[idx]);
                }
            }

            cache[id] = clone(properties);
            result = properties;
        }
        else
        {
            key = idFragments.join('.');
            result = globalProperties.getProperty(key) || '';
            cache[id] = result;
        }

        return result;
    };

    getProperty = function globalProperties_loader__getProperty(id)
    {
        var result;

        if (cache.hasOwnProperty(id))
        {
            result = cache[id];

            if (isObject(result) || Array.isArray(result))
            {
                result = clone(result);
            }
        }
        else
        {
            result = loadProperty(id);
        }

        return result;
    };

    /**
     * This loader module provides the capability to load settings from the alfresco-global.properties loader as AMD modules.
     * 
     * @exports globalProperties
     * @author Axel Faust
     * 
     * @example
     * // loads a single property
     * var prop = require('globalProperties!repository.name')
     * print(prop); // prints "Main Repository" for setting of repository.name in default Repository configuration
     * 
     * @example
     * // loads all properties with the prefix "index.tracking."
     * var props = require('globalProperties!index.tracking.*');
     * print(props['index.tracking.cronExpression']); 
     */
    loader = {
        /**
         * Normalizes a potentially relative module ID to a node-based module ID. In order for relative normalization to work, the module
         * requesting a relative dependency must have been loaded from a nodes content as well.
         * 
         * @instance
         * @param {string}
         *            moduleId - the module ID to normalize
         * @param {function}
         *            normalizeSimpleId - the function handle for the standard (simple) module ID normalization routine
         * @param {object}
         *            [contextModule] - the definition of the module requesting another the module identifier by moduleId
         * @returns {string} the normalized module ID of the requested module
         */
        normalize : function globalProperties_loader__normalize(moduleId, /* jshint unused: false */normalizeSimpleId, contextModule)
        {
            var idFragments, result;

            // ensure potentially dot-separated module ids use / as separator internally (each "property" is its own module)
            idFragments = moduleId.split(/[\/\.]/);
            result = idFragments.join('/');

            return result;
        },

        /**
         * Loads either a single setting or object of settings with the same prefix from a normalized module ID.
         * 
         * @instance
         * @param {string}
         *            normalizedId - the normalized ID of the module to load
         * @param {function}
         *            require - the context-sensitive require function
         * @param {function}
         *            load - the callback to load either a pre-built object as the module result or a script defining a module from a script
         *            URL
         */
        load : function globalProperties_loader__load(normalizedId, require, load)
        {
            var property = getProperty(normalizedId);

            load(property, true);
        }
    };

    Object.freeze(loader.normalize);
    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});