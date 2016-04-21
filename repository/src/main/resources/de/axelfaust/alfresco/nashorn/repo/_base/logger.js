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
define([ 'require', 'nashorn!Java' ], function logger(require, Java)
{
    'use strict';
    var loggerModule, getSimpleLogger, isEnabledImpl, logImpl, loggerByScriptUrl = {}, Throwable;

    Throwable = Java.type('java.lang.Throwable');

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

    isEnabledImpl = function logger__isEnabledImpl(level)
    {
        var logger = getSimpleLogger(), prop, isEnabled = false;

        prop = (level || 'debug') + 'Enabled';
        isEnabled = logger[prop];

        return isEnabled;
    };

    logImpl = function logger__logImpl(level, args)
    {
        var logger, enabledProp, meth;

        // we could delegate to isEnabledImpl but that would mean retrieving logger potentially twice
        logger = getSimpleLogger();
        enabledProp = String((level || 'debug') + 'Enabled');

        // to avoid interop performance overhead we should drop out as soon as possible
        if (logger[enabledProp])
        {
            // TODO Determine caller fn + line and expose via MDC
            meth = level || 'debug';
            logger[meth].apply(logger, args);
        }
    };

    // TODO Provide option to hook in dynamic log delegates (i.e. for JavaScript Console)
    /**
     * This module provides basic logging capabilities and delegates to SLF4J (which in turn will most likely be backed by Log4J). The
     * logging functionality of this module is caller-aware, meaning that each script will log into a distinct logger depending on its
     * module ID or - when no module ID can be determined for a caller - the URL it was loaded from.
     * 
     * @exports _base/logger
     * @author Axel Faust
     */
    // @exports is an alias for @module in this specific constellation (using object literal)
    loggerModule = {

        /**
         * Log a message at "trace" level
         * 
         * @instance
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {string}
         *            [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log
         *            level is enabled (mutually exclusive with error)
         */
        trace : function logger__trace()
        {
            logImpl('trace', arguments);
        },

        /**
         * Checks if the "trace" log level is enabled for the caller script's logger
         * 
         * @instance
         * @returns {boolean} true if the log level is enabled
         */
        isTraceEnabled : function logger__isTraceEnabled()
        {
            return isEnabledImpl('trace');
        },

        /**
         * Log a message at "debug" level
         * 
         * @instance
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {string}
         *            [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log
         *            level is enabled (mutually exclusive with error)
         */
        debug : function logger__debug()
        {
            logImpl('debug', arguments);
        },

        /**
         * Checks if the "debug" log level is enabled for the caller script's logger
         * 
         * @method
         * @instance
         * @returns {boolean} true if the log level is enabled
         */
        isDebugEnabled : function logger__isDebugEnabled()
        {
            return isEnabledImpl('debug');
        },

        /**
         * Log a message at "info" level
         * 
         * @instance
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {string}
         *            [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log
         *            level is enabled (mutually exclusive with error)
         */
        info : function logger__info()
        {
            logImpl('info', arguments);
        },

        /**
         * Checks if the "info" log level is enabled for the caller script's logger
         * 
         * @instance
         * @returns {boolean} true if the log level is enabled
         */
        isInfoEnabled : function logger__isInfoEnabled()
        {
            return isEnabledImpl('info');
        },

        /**
         * Log a message at "warn" level
         * 
         * @instance
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {string}
         *            [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log
         *            level is enabled (mutually exclusive with error)
         */
        warn : function logger__warn()
        {
            logImpl('warn', arguments);
        },

        /**
         * Checks if the "warn" log level is enabled for the caller script's logger
         * 
         * @instance
         * @returns {boolean} true if the log level is enabled
         */
        isWarnEnabled : function logger__isWarnEnabled()
        {
            return isEnabledImpl('warn');
        },

        /**
         * Log a message at "error" level
         * 
         * @instance
         * @param {string}
         *            message - the message / pattern for the log message
         * @param {Error|Throwable}
         *            [error] - the error / exception that needs to be logged
         * @param {string}
         *            [argX] - (multiple) log message pattern substitution values to be used in rendering the full log message if the log
         *            level is enabled (mutually exclusive with error)
         */
        error : function logger__error()
        {
            logImpl('error', arguments);
        },

        /**
         * Checks if the "error" log level is enabled for the caller script's logger
         * 
         * @instance
         * @returns {boolean} true if the log level is enabled
         */
        isErrorEnabled : function logger__isErrorEnabled()
        {
            return isEnabledImpl('error');
        }
    };

    Object.freeze(loggerModule);

    return loggerModule;
});