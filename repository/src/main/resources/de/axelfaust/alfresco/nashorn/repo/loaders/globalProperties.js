/* globals -require */
(function()
{
    'use strict';
    define('globalProperties', [ 'spring!global-properties','nashorn!Java' ], function globalProperties_loader(globalProperties, Java)
    {
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

        loader = {
            normalize : function globalProperties_loader__normalize(moduleId, /*jshint unused: false*/normalizeSimpleId, /*jshint unused: false*/contextModule)
            {
                var idFragments, result;

                // ensure potentially dot-separated module ids use / as separator internally (each "property" is its own module)
                idFragments = moduleId.split(/[\/\.]/);
                result = idFragments.join('/');

                return result;
            },
            load : function globalProperties_loader__load(normalizedId, /*jshint unused: false*/require, load)
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
}());