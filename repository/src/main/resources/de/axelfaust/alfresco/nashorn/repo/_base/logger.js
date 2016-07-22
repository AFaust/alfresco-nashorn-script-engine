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
define([ 'require', 'define' ], function logger(require, define)
{
    'use strict';
    var loggerModule, getSimpleLogger, loggerByScriptUrl = {};

    getSimpleLogger = function logger__getSimpleLogger(callerScriptURL)
    {
        var callerScriptModuleId, callerScriptModuleLoader, logger;

        if (loggerByScriptUrl.hasOwnProperty(callerScriptURL))
        {
            logger = loggerByScriptUrl[callerScriptURL];
        }
        else
        {
            callerScriptModuleId = require.getScriptFileModuleId(callerScriptURL);
            callerScriptModuleLoader = require.getScriptFileModuleLoader(callerScriptURL);

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
        // callerUrl provided via 'callerProvided' flag in special module handling
        trace : function logger__trace(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            if (logger.isTraceEnabled())
            {
                logger.trace.apply(logger, Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Checks if the "trace" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        // callerUrl provided via 'callerProvided' flag in special module handling
        isTraceEnabled : function logger__isTraceEnabled(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
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
        // callerUrl provided via 'callerProvided' flag in special module handling
        debug : function logger__debug(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            if (logger.isDebugEnabled())
            {
                logger.debug.apply(logger, Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Checks if the "debug" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        // callerUrl provided via 'callerProvided' flag in special module handling
        isDebugEnabled : function logger__isDebugEnabled(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
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
        // callerUrl provided via 'callerProvided' flag in special module handling
        info : function logger__info(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            if (logger.isInfoEnabled())
            {
                logger.info.apply(logger, Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Checks if the "info" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        // callerUrl provided via 'callerProvided' flag in special module handling
        isInfoEnabled : function logger__isInfoEnabled(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
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
        // callerUrl provided via 'callerProvided' flag in special module handling
        warn : function logger__warn(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            if (logger.isWarnEnabled())
            {
                logger.warn.apply(logger, Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Checks if the "warn" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        // callerUrl provided via 'callerProvided' flag in special module handling
        isWarnEnabled : function logger__isWarnEnabled(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
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
        // callerUrl provided via 'callerProvided' flag in special module handling
        error : function logger__error(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            if (logger.isErrorEnabled())
            {
                logger.error.apply(logger, Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Checks if the "error" log level is enabled for the caller script's logger
         * 
         * @instance
         * @memberof module:_base/logger
         * @returns {boolean} true if the log level is enabled
         */
        // callerUrl provided via 'callerProvided' flag in special module handling
        isErrorEnabled : function logger__isErrorEnabled(callerUrl)
        {
            var logger = getSimpleLogger(callerUrl);
            return logger.isErrorEnabled();
        }
    };

    Object.freeze(loggerModule);

    return define.asSpecialModule(loggerModule, [ 'callerProvided' ]);
});