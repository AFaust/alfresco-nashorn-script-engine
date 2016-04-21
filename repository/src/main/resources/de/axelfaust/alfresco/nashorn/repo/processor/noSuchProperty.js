/* globals SimpleLogger: false */
/* globals -define */
(function noSuchProperty()
{
    'use strict';

    var _this, defaultNoSuchPropertyImpl, noSuchPropertyImpl, logger;

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.noSuchProperty');

    _this = this;
    defaultNoSuchPropertyImpl = this.__noSuchProperty__;
    noSuchPropertyImpl = function __noSuchProperty__(propName)
    {
        var defaultResult, result, restoreFn;

        logger.trace('Delegating to default __noSuchProperty__ to try and load {}', propName);
        defaultResult = defaultNoSuchPropertyImpl.call(_this, propName);

        result = defaultResult;

        logger.trace('Trying to load legacy root object {}', propName);

        // tag our caller as the actual caller to require
        restoreFn = require.tagCallerScript(true);
        try
        {
            require([ 'legacyRootObjects!' + propName ], function __noSuchProperty__require_callback(value)
            {
                logger.debug('Resolved "{}" for legacy root object {}', value, propName);
                result = value;
            });

            restoreFn();
        }
        catch (e)
        {
            restoreFn();
            logger.debug('Failed to load legacy root object {}', propName);
            result = defaultResult;
        }

        return result;
    };

    Object.defineProperty(this, '__noSuchProperty__', {
        value : noSuchPropertyImpl
    });

    Object.freeze(noSuchPropertyImpl);
}.call(this));