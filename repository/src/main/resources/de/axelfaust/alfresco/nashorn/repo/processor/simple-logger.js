/* globals -require */
/* globals -define */
/* globals Java: false */
(function simple_logger()
{
    'use strict';
    var SimpleLoggerCtor, LoggerFactory, Throwable, Locale;

    LoggerFactory = Java.type('org.slf4j.LoggerFactory');
    Throwable = Java.type('java.lang.Throwable');
    Locale = Java.type('java.util.Locale');

    SimpleLoggerCtor = function simple_logger__constructor(loggerName)
    {
        this.logger = LoggerFactory.getLogger(loggerName);
    };

    SimpleLoggerCtor.prototype = {

        __noSuchProperty__ : function simple_logger__noSuchProperty__(name)
        {
            var result, getterName;
            if (/^(trace|debug|info|warn|error)Enabled$/.test(name))
            {
                getterName = 'is' + name.substring(0, 1).toUpperCase(Locale.ENGLISH) + name.substring(1);
                result = this[getterName]();
            }

            return result;
        },

        isTraceEnabled : function simple_logger__isTraceEnabled()
        {
            return this.logger.traceEnabled;
        },

        isDebugEnabled : function simple_logger__isDebugEnabled()
        {
            return this.logger.debugEnabled;
        },

        isInfoEnabled : function simple_logger__isInfoEnabled()
        {
            return this.logger.infoEnabled;
        },

        isWarnEnabled : function simple_logger__isWarnEnabled()
        {
            return this.logger.warnEnabled;
        },

        isErrorEnabled : function simple_logger__isErrorEnabled()
        {
            return this.logger.errorEnabled;
        },

        trace : function simple_logger__trace(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.trace(message);
            }
            else if (arguments.length === 2 && arg2 instanceof Throwable)
            {
                this.logger.trace(message, arg2);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                this.logger['trace(java.lang.String,java.lang.Object[])'](message, arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                this.logger['trace(java.lang.String,java.lang.Object[])'](message, args);
            }
        },

        debug : function simple_logger__debug(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.debug(message);
            }
            else if (arguments.length === 2 && arg2 instanceof Throwable)
            {
                this.logger.debug(message, arg2);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                this.logger['debug(java.lang.String,java.lang.Object[])'](message, arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                this.logger['debug(java.lang.String,java.lang.Object[])'](message, args);
            }
        },

        info : function simple_logger__info(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.info(message);
            }
            else if (arguments.length === 2 && arg2 instanceof Throwable)
            {
                this.logger.info(message, arg2);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                this.logger['info(java.lang.String,java.lang.Object[])'](message, arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                this.logger['info(java.lang.String,java.lang.Object[])'](message, args);
            }
        },

        warn : function simple_logger__warn(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.warn(message);
            }
            else if (arguments.length === 2 && arg2 instanceof Throwable)
            {
                this.logger.warn(message, arg2);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                this.logger['warn(java.lang.String,java.lang.Object[])'](message, arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                this.logger['warn(java.lang.String,java.lang.Object[])'](message, args);
            }
        },

        error : function simple_logger__error(message, arg2)
        {
            var args, idx;

            if (arguments.length === 1)
            {
                this.logger.error(message);
            }
            else if (arguments.length === 2 && arg2 instanceof Throwable)
            {
                this.logger.error(message, arg2);
            }
            else if (arguments.length === 2 && Array.isArray(arg2))
            {
                this.logger['error(java.lang.String,java.lang.Object[])'](message, arg2);
            }
            else if (arguments.length > 1)
            {
                args = [];
                for (idx = 1; idx < arguments.length; idx++)
                {
                    args.push(arguments[idx]);
                }

                this.logger['error(java.lang.String,java.lang.Object[])'](message, args);
            }
        }

    };

    Object.freeze(SimpleLoggerCtor.prototype);
    Object.freeze(SimpleLoggerCtor);

    Object.defineProperty(this, 'SimpleLogger', {
        value : SimpleLoggerCtor,
        enumerable : false
    });

}.call(this));