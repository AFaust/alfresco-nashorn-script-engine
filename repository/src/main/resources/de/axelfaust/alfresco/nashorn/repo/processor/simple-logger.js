/* globals -require */
/* globals -define */
/* globals Java: false */
(function simple_logger()
{
    'use strict';
    var NativeLogger;

    NativeLogger = Java.type('de.axelfaust.alfresco.nashorn.repo.utils.NativeLogger');

    /**
     * A wrapper around a SLF4J logger for script interoperability. The constructor can't be called by any script code
     * 
     * @class SimpleLogger
     * @private
     */

    /**
     * Flag representing enablement of the trace log level
     * 
     * @name SimpleLogger#traceEnabled
     * @type {boolean}
     * @readonly
     */

    /**
     * Checks if the trace log level is enabled for this instance.
     * 
     * @function
     * @name SimpleLogger#isTraceEnabled
     * @returns {boolean} true if the trace log level is enabled, false otherwise
     */

    /**
     * Flag representing enablement of the debug log level
     * 
     * @name SimpleLogger#debugEnabled
     * @type {boolean}
     * @readonly
     */

    /**
     * Checks if the debug log level is enabled for this instance.
     * 
     * @function
     * @name SimpleLogger#isDebugEnabled
     * @returns {boolean} true if the debug log level is enabled, false otherwise
     */

    /**
     * Flag representing enablement of the info log level
     * 
     * @name SimpleLogger#infoEnabled
     * @type {boolean}
     * @readonly
     */

    /**
     * Checks if the trace info level is enabled for this instance.
     * 
     * @function
     * @name SimpleLogger#isInfoEnabled
     * @returns {boolean} true if the info log level is enabled, false otherwise
     */

    /**
     * Flag representing enablement of the warn log level
     * 
     * @name SimpleLogger#warnEnabled
     * @type {boolean}
     * @readonly
     */

    /**
     * Checks if the warn log level is enabled for this instance.
     * 
     * @function
     * @name SimpleLogger#isWarnEnabled
     * @returns {boolean} true if the warn log level is enabled, false otherwise
     */

    /**
     * Flag representing enablement of the error log level
     * 
     * @name SimpleLogger#errorEnabled
     * @type {boolean}
     * @readonly
     */

    /**
     * Checks if the error log level is enabled for this instance.
     * 
     * @function
     * @name SimpleLogger#isErrorEnabled
     * @returns {boolean} true if the error log level is enabled, false otherwise
     */

    /**
     * Logs a message at trace level.
     * 
     * @function
     * @name SimpleLogger#trace
     * @param {string}
     *            message - the message to log, potentially including value placeholders in the form of '{}'
     * @param {Error|Throwable|object|object[]}
     *            [params] - either a) the native error or Java exception to log, or b) the parameter(s) to fill placeholders in the log
     *            message (if the log level is enabled) - multiple arguments can be provided either as an array or vararg-like list of
     *            values
     */

    /**
     * Logs a message at debug level.
     * 
     * @function
     * @name SimpleLogger#debug
     * @param {string}
     *            message - the message to log, potentially including value placeholders in the form of '{}'
     * @param {Error|Throwable|object|object[]}
     *            [params] - either a) the native error or Java exception to log, or b) the parameter(s) to fill placeholders in the log
     *            message (if the log level is enabled) - multiple arguments can be provided either as an array or vararg-like list of
     *            values
     */

    /**
     * Logs a message at info level.
     * 
     * @function
     * @name SimpleLogger#info
     * @param {string}
     *            message - the message to log, potentially including value placeholders in the form of '{}'
     * @param {Error|Throwable|object|object[]}
     *            [params] - either a) the native error or Java exception to log, or b) the parameter(s) to fill placeholders in the log
     *            message (if the log level is enabled) - multiple arguments can be provided either as an array or vararg-like list of
     *            values
     */

    /**
     * Logs a message at warn level.
     * 
     * @function
     * @name SimpleLogger#warn
     * @param {string}
     *            message - the message to log, potentially including value placeholders in the form of '{}'
     * @param {Error|Throwable|object|object[]}
     *            [params] - either a) the native error or Java exception to log, or b) the parameter(s) to fill placeholders in the log
     *            message (if the log level is enabled) - multiple arguments can be provided either as an array or vararg-like list of
     *            values
     */

    /**
     * Logs a message at error level.
     * 
     * @function
     * @name SimpleLogger#error
     * @param {string}
     *            message - the message to log, potentially including value placeholders in the form of '{}'
     * @param {Error|Throwable|object|object[]}
     *            [params] - either a) the native error or Java exception to log, or b) the parameter(s) to fill placeholders in the log
     *            message (if the log level is enabled) - multiple arguments can be provided either as an array or vararg-like list of
     *            values
     */

    /**
     * Retrieves a new facade to a SLF4J logger instance with the provided name.
     * 
     * @global
     * @function
     * @name getSimpleLogger
     * @param {string}
     *            loggerName - the name of the underlying logger to facade
     * @returns {SimpleLogger}
     */
    Object.defineProperty(this, 'getSimpleLogger', {
        value : NativeLogger.getLogger,
        enumerable : false
    });
}.call(this));