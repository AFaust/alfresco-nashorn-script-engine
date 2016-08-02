/* globals -require */
/* globals getSimpleLogger: false */
define('legacyRootObjects', [ 'globalProperties!nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.*',
        'nashorn!Java' ], function legacyRootObjects_loader(legacyRootObjects, Java)
{
    'use strict';

    var logger, loader, isObject, propertyPrefix, runtimeRootObjects;

    logger = getSimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.legacyRootObjects');
    propertyPrefix = 'nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.';
    runtimeRootObjects = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel').newAssociativeContainer();

    isObject = function legacyRootObjects_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    /**
     * This loader module provides the capability to load legacy root objects as AMD modules. The set of available legacy root objects is
     * constructed from AMD modules registered with this loader via
     * nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.* configuration in the alfresco-global.properties
     * file(s) and the script argument model.
     * 
     * @exports legacyRootObjects
     * @author Axel Faust
     */
    loader = {

        /**
         * Registers a custom root object within the currently executed runtime.
         * 
         * @instance
         * @param {string}
         *            normalizedId - the normalized ID of the module to register
         * @param {object}
         *            module - the module to register
         * @param {boolean}
         *            secure - whether the module should be made available to secure scripts only
         */
        registerRootObject : function legacyRootObjects_loader__registerRootObject(normalizedId, module, secure)
        {
            runtimeRootObjects[normalizedId] = {
                module : module,
                secure : secure === true
            };
        },

        /**
         * Loads a legacy root object from a normalized module ID.
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
        load : function legacyRootObjects_loader__load(normalizedId, require, load)
        {
            var result, isSecure, legacyModulePropertyPrefix, legacyModuleId, legacyModuleLoaderName, legacyModuleSecure;

            if (normalizedId in runtimeRootObjects)
            {
                result = runtimeRootObjects[normalizedId].module;
                isSecure = runtimeRootObjects[normalizedId].secure;
            }

            if (result === undefined)
            {
                legacyModulePropertyPrefix = propertyPrefix + normalizedId;
                legacyModuleId = legacyRootObjects[legacyModulePropertyPrefix + '.moduleId'];

                if (typeof legacyModuleId === 'string')
                {
                    legacyModuleLoaderName = legacyRootObjects[legacyModulePropertyPrefix + '.loaderName'];
                    legacyModuleSecure = legacyRootObjects[legacyModulePropertyPrefix + '.secure'];

                    if (typeof legacyModuleLoaderName === 'string')
                    {
                        legacyModuleId = legacyModuleLoaderName + '!' + legacyModuleId;
                    }
                    else
                    {
                        legacyModuleId = legacyModuleId;
                    }

                    isSecure = legacyModuleSecure === true || legacyModuleSecure === 'true';
                    if (logger.traceEnabled)
                    {
                        logger.trace('Loading legacy root object module {} as secure={}', legacyModuleId, isSecure);
                    }

                    // tag our caller as the actual caller to require
                    require.withTaggedCallerScript(function legacyRootObjects_loader__load__legacyRootObject_outerCallback()
                    {
                        require([ legacyModuleId ], function legacyRootObjects_loader__load__legacyRootObject_innerCallback(value)
                        {
                            if (logger.debugEnabled)
                            {
                                logger.debug('Resolved {} for legacy root object {}', value, legacyModuleId);
                            }
                            result = value;
                        });
                    }, true);
                }
            }

            if (result !== undefined)
            {
                load(result, isSecure);
            }
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});