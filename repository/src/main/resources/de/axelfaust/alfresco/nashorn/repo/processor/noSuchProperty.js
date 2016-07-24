/* globals SimpleLogger: false */
/* globals Java: false */
/* globals -define */
(function noSuchProperty__root()
{
    'use strict';

    var _this, defaultNoSuchPropertyImpl, lookupDefault, lookupLegacyRootObject, lookupArg, noSuchPropertyImpl, logger, cachedValues;

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.noSuchProperty');
    cachedValues = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel').newAssociativeContainer();

    _this = this;
    defaultNoSuchPropertyImpl = this.__noSuchProperty__;

    lookupDefault = function __noSuchProperty__lookupDefault(propName)
    {
        var result;

        logger.trace('Delegating to default __noSuchProperty__ to try and load {}', propName);
        result = defaultNoSuchPropertyImpl.call(_this, propName);

        return result;
    };

    lookupLegacyRootObject = function __noSuchProperty__lookupLegacyRootObject(propName)
    {
        var result;

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
        }

        if (result !== undefined)
        {
            cachedValues[propName] = result;
        }

        return result;
    };

    lookupArg = function __noSuchProperty__lookupArg(propName)
    {
        var result;

        try
        {
            logger.trace('Trying to load script argument {}', propName);
            require([ 'args!' + propName ], function __noSuchProperty__require_argsCallback(value)
            {
                logger.debug('Resolved {} from argument {}', value, propName);
                result = value;
            });
        }
        catch (e)
        {
            logger.debug('Failed to load argument {}', propName);
        }

        if (result !== undefined)
        {
            cachedValues[propName] = result;
        }

        return result;
    };

    noSuchPropertyImpl = function __noSuchProperty__(propName)
    {
        var result;

        logger.trace('Checking previously cached __noSuchProperty__ result for {}', propName);
        if (propName in cachedValues)
        {
            result = cachedValues[propName];
            logger.debug('Found previously cached __noSuchProperty__ result {} for {}', result, propName);
        }

        if (result === undefined)
        {
            result = lookupDefault(propName);
        }

        if (result === undefined)
        {
            result = lookupLegacyRootObject(propName);
        }

        if (result === undefined)
        {
            result = lookupArg(propName);
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