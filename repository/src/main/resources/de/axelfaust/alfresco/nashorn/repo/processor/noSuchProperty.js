/* globals -define */
(function noSuchProperty()
{
    'use strict';

    var _this, defaultNoSuchPropertyImpl, noSuchPropertyImpl, logger, Java, protectedProperties;

    Java = require('nashorn!Java');
    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.noSuchProperty');

    protectedProperties = {
        _preloadModule : true,
        _loadableModule : true,
        _scriptContextUUID : true,
        _argumentModel : true
    };

    _this = this;
    defaultNoSuchPropertyImpl = this.__noSuchProperty__;
    noSuchPropertyImpl = function __noSuchProperty__(propName)
    {
        var defaultResult, result;

        logger.trace('Delegating to default __noSuchProperty__ to try and load {}', propName);
        defaultResult = defaultNoSuchPropertyImpl.call(_this, propName);

        result = defaultResult;

        if (protectedProperties[propName] !== true)
        {
            try
            {
                logger.trace('Trying to load legacy root object {}', propName);
                // TODO We must somehow pass the callers module context to require for proper evaluation of security context
                require([ 'legacyRootObject!' + propName ], function __noSuchProperty__require_callback(value)
                {
                    logger.debug('Resolved {} for legacy root object {}', value, propName);
                    result = value;
                });
            }
            catch (e)
            {
                logger.debug('Failed to load legacy root object {}', propName);
                result = defaultResult;
            }
        }

        return result;
    };

    Object.defineProperty(this, '__noSuchProperty__', {
        value : noSuchPropertyImpl
    });

    Object.freeze(noSuchPropertyImpl);
}.call(this));