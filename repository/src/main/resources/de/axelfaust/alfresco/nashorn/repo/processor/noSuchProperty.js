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
        var defaultResult, result;

        logger.trace('Delegating to default __noSuchProperty__ to try and load {}', propName);
        defaultResult = defaultNoSuchPropertyImpl.call(_this, propName);

        result = defaultResult;

        logger.trace('Trying to load legacy root object {}', propName);

        // tag our caller as the actual caller to require
        try
        {
            require.withTaggedCallerScript(function __noSuchProperty__require_outerCallback()
            {
                require([ 'legacyRootObjects!' + propName ], function __noSuchProperty__require_innerCallback(value)
                {
                    logger.debug('Resolved "{}" for legacy root object {}', value, propName);
                    result = value;
                });
            }, true);
        }
        catch (e)
        {
            logger.debug('Failed to load legacy root object', e);
            result = defaultResult;
        }

        // every caller script should be strict - either explicitly or because we force it via our loaders
        if (result === undefined)
        {
            throw new ReferenceError('"' + propName + '" is not defined');
        }

        return result;
    };

    Object.defineProperty(this, '__noSuchProperty__', {
        value : noSuchPropertyImpl
    });

    Object.freeze(noSuchPropertyImpl);
}.call(this));