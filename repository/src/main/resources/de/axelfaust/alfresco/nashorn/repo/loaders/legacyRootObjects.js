/* globals -require */
define('legacyRootObject', [ 'globalProperties!nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.*',
        'nashorn!Java' ], function legacyRootObjects_loader(legacyRootObjects, Java)
{
    'use strict';

    var logger, loader, isObject, propertyPrefix;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.legacyRootObjects');
    propertyPrefix = 'nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.';

    isObject = function legacyRootObjects_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    loader = {
        load : function legacyRootObjects_loader__load(normalizedId, require, load)
        {
            var result, isSecure, legacyModuleId, legacyModuleLoaderName, legacyModuleSecure, resetFn;

            legacyModuleId = legacyRootObjects[propertyPrefix + normalizedId + '.moduleId'];

            if (typeof legacyModuleId === 'string')
            {
                legacyModuleLoaderName = legacyRootObjects[propertyPrefix + normalizedId + '.loaderName'];
                legacyModuleSecure = legacyRootObjects[propertyPrefix + normalizedId + '.secure'];

                if (typeof legacyModuleLoaderName === 'string')
                {
                    legacyModuleId = legacyModuleLoaderName + '!' + legacyModuleId;
                }
                else
                {
                    legacyModuleId = legacyModuleId;
                }

                isSecure = legacyModuleSecure === true || legacyModuleSecure === 'true';
                logger.trace('Loading legacy root object module {} as secure={}', [ legacyModuleId, isSecure ]);

                // tag our caller as the actual caller to require
                resetFn = require.tagCallerScript(true);

                try
                {
                    require([ legacyModuleId ], function legacyRootObjects_loader__load__legacyRootObject_callback(value)
                    {
                        logger.debug('Resolved {} for legacy root object {}', value, legacyModuleId);
                        result = value;
                    });

                    resetFn();
                }
                catch (e)
                {
                    resetFn();
                    throw e;
                }
            }

            if (result === undefined)
            {
                // arguments are never considered secure
                isSecure = false;
                try
                {
                    logger.trace('Loading legacy root object module {} from arguments', normalizedId);
                    require([ 'args!' + normalizedId ], function legacyRootObjects_loader__load__args_callback(value)
                    {
                        logger.debug('Resolved {} from argument {}', value, normalizedId);
                        result = value;
                    });
                }
                catch (e)
                {
                    logger.debug('Failed to load argument {}', normalizedId);
                    result = undefined;
                }
            }

            load(result, isSecure);
        }
    };

    Object.freeze(loader.load);
    Object.freeze(loader);

    return loader;
});