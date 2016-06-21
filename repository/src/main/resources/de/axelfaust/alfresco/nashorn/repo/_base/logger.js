/*
 * The logger name schemata are as follows:
 * - de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.&lt;loaderName&gt;.&lt;moduleId&gt;
 * - de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.&lt;scriptUrl&gt;
 * 
 * &lt;loaderName&gt; is the name of the loader plugin that loaded the script, i.e. "classpath" or "webscript".
 * 
 * &lt;moduleId&gt; is the nominal module ID (i.e. "_base/logger") with forward slashes converted into dots.
 * 
 * &lt;scriptUrl&gt; is the abstract URL from which a script has been loaded. "Abstract" in this regard means
 * that it may be an URL with a custom semantic protocol identifier that is only resolveable within the script engine.
 * An example scriptUrl might be "extensible-classpath://scripts/my-script.js" for a script that is resolved against
 * the classpath in such a way that scripts in the servers extension-root can override scripts bundled with the WAR. 
 */
/* globals -require */
/* globals SimpleLogger: false */
define([ 'require' ], function logger(require)
{
    'use strict';
    var loggerModule, getSimpleLogger, loggerByScriptUrl = {};

    getSimpleLogger = function logger__getSimpleLogger()
    {
        var callerScriptURL, callerScriptModuleId, callerScriptModuleLoader, logger;

        callerScriptURL = require.getCallerScriptURL(true);

        if (loggerByScriptUrl.hasOwnProperty(callerScriptURL))
        {
            logger = loggerByScriptUrl[callerScriptURL];
        }
        else
        {
            callerScriptModuleId = require.getCallerScriptModuleId(true);
            callerScriptModuleLoader = require.getCallerScriptModuleLoader(true);

            if (typeof callerScriptModuleId === 'string')
            {
                logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.'
                        + callerScriptModuleLoader + '.' + callerScriptModuleId.replace(/\//g, '.'));
            }
            else
            {
                // TODO Try to simplify (common) script URLs for shorter, easier-to-handle logger names
                logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.logger.' + callerScriptURL);
            }
            loggerByScriptUrl[callerScriptURL] = logger;
        }

        return logger;
    };

    // TODO Provide option to hook in dynamic log delegates (i.e. for JavaScript Console)
    /**
     * This module provides basic logging capabilities and delegates to SLF4J (which in turn will most likely be backed by Log4J). The
     * logging functionality of this module is caller-aware, meaning that each script will log into a distinct logger depending on its
     * module ID or - when no module ID can be determined for a caller - the URL it was loaded from.
     * 
     * @module _base/logger
     * @author Axel Faust
     */
    loggerModule = {

        /**
         * Log a message at "trace" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        trace : function logger__trace()
        {
            // hard redirect is better than dynamic lookup in generic logImpl we had previously
            var logger = getSimpleLogger();
            // TODO Determine caller fn + line and expose via MDC
            logger.trace.apply(logger, arguments);
        },

        /**
         * Checks if the "trace" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isTraceEnabled : function logger__isTraceEnabled()
        {
            // hard redirect is better than dynamic lookup in generic isEnabledImpl we had previously
            var logger = getSimpleLogger();
            return logger.isTraceEnabled();
        },

        /**
         * Log a message at "debug" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        debug : function logger__debug()
        {
            // hard redirect is better than dynamic lookup in generic logImpl we had previously
            var logger = getSimpleLogger();
            // TODO Determine caller fn + line and expose via MDC
            logger.debug.apply(logger, arguments);
        },

        /**
         * Checks if the "debug" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isDebugEnabled : function logger__isDebugEnabled()
        {
            // hard redirect is better than dynamic lookup in generic isEnabledImpl we had previously
            var logger = getSimpleLogger();
            return logger.isDebugEnabled();
        },

        /**
         * Log a message at "info" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        info : function logger__info()
        {
            // hard redirect is better than dynamic lookup in generic logImpl we had previously
            var logger = getSimpleLogger();
            // TODO Determine caller fn + line and expose via MDC
            logger.info.apply(logger, arguments);
        },

        /**
         * Checks if the "info" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isInfoEnabled : function logger__isInfoEnabled()
        {
            // hard redirect is better than dynamic lookup in generic isEnabledImpl we had previously
            var logger = getSimpleLogger();
            return logger.isInfoEnabled();
        },

        /**
         * Log a message at "warn" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        warn : function logger__warn()
        {
            // hard redirect is better than dynamic lookup in generic logImpl we had previously
            var logger = getSimpleLogger();
            // TODO Determine caller fn + line and expose via MDC
            logger.warn.apply(logger, arguments);
        },

        /**
         * Checks if the "warn" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isWarnEnabled : function logger__isWarnEnabled()
        {
            // hard redirect is better than dynamic lookup in generic isEnabledImpl we had previously
            var logger = getSimpleLogger();
            return logger.isWarnEnabled();
        },

        /**
         * Log a message at "error" level
         * 
         * @instance
         * @memberof module:_base/logger
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {...object|array}
         *            [params] - log message pattern substitution values to be used in rendering the full log message if the log level is
         *            enabled (mutually exclusive with error)
         */
        error : function logger__error()
        {
            // hard redirect is better than dynamic lookup in generic logImpl we had previously
            var logger = getSimpleLogger();
            // TODO Determine caller fn + line and expose via MDC
            logger.error.apply(logger, arguments);
        },

        /**
         * Checks if the "error" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        isErrorEnabled : function logger__isErrorEnabled()
        {
            // hard redirect is better than dynamic lookup in generic isEnabledImpl we had previously
            var logger = getSimpleLogger();
            return logger.isErrorEnabled();
        }
    };

    Object.freeze(loggerModule);

    return loggerModule;
});