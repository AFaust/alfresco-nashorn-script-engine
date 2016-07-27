/* globals SimpleLogger: false */
/* globals Java: false */
/* globals -define */
(function noSuchProperty__root()
{
    'use strict';

    var _this, defaultNoSuchPropertyImpl, lookupDefault, lookupLegacyRootObject, lookupArg, noSuchPropertyImpl, logger, loggerState, cachedValues;

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.noSuchProperty');
    cachedValues = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel').newAssociativeContainer();

    // we use loggerState to avoid costly call-linking (and potentially array-parameter preparation) for any log statements if the log level
    // is not enabled at all (at the beginning of an execution / first check)
    loggerState = (function noSuchProperty__loggerState_init()
    {
        var NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');

        return NashornScriptModel.newAssociativeContainer(function amd__loggerState_getLogLevelEnabled(name)
        {
            var result;

            switch (name)
            {
                case 'trace':
                    result = logger.isTraceEnabled();
                    break;
                case 'debug':
                    result = logger.isDebugEnabled();
                    break;
                case 'info':
                    result = logger.isInfoEnabled();
                    break;
                case 'warn':
                    result = logger.isWarnEnabled();
                    break;
                case 'error':
                    result = logger.isErrorEnabled();
                    break;
                default:
                    result = false;
            }

            return result;
        });
    }());

    _this = this;
    defaultNoSuchPropertyImpl = this.__noSuchProperty__;

    lookupDefault = function __noSuchProperty__lookupDefault(propName)
    {
        var result;

        if (loggerState.trace)
        {
            logger.trace('Delegating to default __noSuchProperty__ to try and load {}', propName);
        }
        result = defaultNoSuchPropertyImpl.call(_this, propName);

        return result;
    };

    lookupLegacyRootObject = function __noSuchProperty__lookupLegacyRootObject(propName)
    {
        var result;

        if (loggerState.trace)
        {
            logger.trace('Trying to load legacy root object {}', propName);
        }

        // tag our caller as the actual caller to require
        try
        {
            require.withTaggedCallerScript(function __noSuchProperty__require_outerCallback()
            {
                require([ 'legacyRootObjects!' + propName ], function __noSuchProperty__require_innerCallback(value)
                {
                    if (loggerState.debug)
                    {
                        logger.debug('Resolved "{}" for legacy root object {}', value, propName);
                    }
                    result = value;
                });
            }, true);
        }
        catch (e)
        {
            if (loggerState.debug)
            {
                logger.debug('Failed to load legacy root object', e);
            }
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
            if (loggerState.trace)
            {
                logger.trace('Trying to load script argument {}', propName);
            }
            require([ 'args!' + propName ], function __noSuchProperty__require_argsCallback(value)
            {
                if (loggerState.debug)
                {
                    logger.debug('Resolved {} from argument {}', value, propName);
                }
                result = value;
            });
        }
        catch (e)
        {
            if (loggerState.debug)
            {
                logger.debug('Failed to load argument {}', propName);
            }
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

        if (loggerState.trace)
        {
            logger.trace('Checking previously cached __noSuchProperty__ result for {}', propName);
        }
        if (propName in cachedValues)
        {
            result = cachedValues[propName];
            if (loggerState.debug)
            {
                logger.debug('Found previously cached __noSuchProperty__ result {} for {}', result, propName);
            }
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