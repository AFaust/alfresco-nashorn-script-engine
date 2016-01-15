/* globals -require */
define('legacyRootObject', [ 'globalProperties!nashornJavaScriptProcessor.de.axelfaust.alfresco.nashorn.repo.legacyRootObjects.*',
        'nashorn!Java' ], function legacyRootObjects_loader(legacyRootObjects, Java)
{
    'use strict';

    var logger, loader, isObject;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.legacyRootObjects');

    isObject = function legacyRootObjects_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    loader = {
        load : function legacyRootObjects_loader__load(normalizedId, require, load)
        {
            var legacyRootObject, result, isSecure, loadModuleId;

            if (legacyRootObjects.hasOwnProperty(normalizedId))
            {
                legacyRootObject = legacyRootObjects[normalizedId];

                if (isObject(legacyRootObject) && typeof legacyRootObject.moduleId === 'string')
                {
                    loadModuleId = legacyRootObject.moduleId;

                    if (typeof legacyRootObject.loaderName === 'string')
                    {
                        loadModuleId = legacyRootObject.loaderName + '!' + loadModuleId;
                    }

                    isSecure = legacyRootObject.secure === true || legacyRootObject.secure === 'true';
                    logger.trace('Loading legacy root object module {} as secure={}', loadModuleId, isSecure);
                    require([ loadModuleId ], function legacyRootObjects_loader__load__legacyRootObject_callback(value)
                    {
                        logger.debug('Resolved {} for legacy root object {}', value, loadModuleId);
                        result = value;
                    });
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