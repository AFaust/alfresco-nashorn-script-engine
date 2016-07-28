/*
 * Copyright 2016 Axel Faust
 *
 * Licensed under the Eclipse Public License (EPL), Version 1.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the License at
 *
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
package de.axelfaust.alfresco.nashorn.repo.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import jdk.nashorn.api.scripting.AbstractJSObject;
import jdk.nashorn.api.scripting.ScriptUtils;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ScriptObject;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This class provides a wrapper around specific {@link Logger SLF4J logger} instances for scripts to interact with for logging purposes. A
 * "script-only" approach was previously tried but found to result in too much overhead during call linking, and generally required to much
 * complexity trying to keep log overhead down through various means of caching (e.g. of {@link Logger#isTraceEnabled() isTraceEnabled}
 * results).
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class NativeLogger extends AbstractJSObject
{

    /**
     * This class provides wrappers for the log enablement check-methods of a native logger.
     *
     * @author Axel Faust
     */
    protected static class LogEnabledMethod extends AbstractJSObject
    {

        protected final String logCheckMethodName;

        protected LogEnabledMethod(final String logCheckMethodName)
        {
            this.logCheckMethodName = logCheckMethodName;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public Object call(final Object thiz, final Object... args)
        {
            if (!(thiz instanceof NativeLogger))
            {
                throw new UnsupportedOperationException("Log enablement check method/function can only be called on a NativeLogger");
            }

            final Logger logger = ((NativeLogger) thiz).logger;

            boolean enabled;
            switch (this.logCheckMethodName)
            {
                case "isTraceEnabled":
                    enabled = logger.isTraceEnabled();
                    break;
                case "isDebugEnabled":
                    enabled = logger.isDebugEnabled();
                    break;
                case "isInfoEnabled":
                    enabled = logger.isInfoEnabled();
                    break;
                case "isWarnEnabled":
                    enabled = logger.isWarnEnabled();
                    break;
                case "isErrorEnabled":
                    enabled = logger.isErrorEnabled();
                    break;
                default:
                    enabled = false;
            }

            return Boolean.valueOf(enabled);
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public boolean isFunction()
        {
            return true;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public boolean isStrictFunction()
        {
            return true;
        }

    }

    /**
     * This class provides wrappers for the actual logging methods of a native logger.
     *
     * @author Axel Faust
     */
    protected static class LogMethod extends AbstractJSObject
    {

        protected final String logMethodName;

        protected LogMethod(final String logMethodName)
        {
            this.logMethodName = logMethodName;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public Object call(final Object thiz, final Object... args)
        {
            if (!(thiz instanceof NativeLogger))
            {
                throw new UnsupportedOperationException("Logging method/function can only be called on a NativeLogger");
            }

            final Logger logger = ((NativeLogger) thiz).logger;

            boolean enabled;
            switch (this.logMethodName)
            {
                case "trace":
                    enabled = logger.isTraceEnabled();
                    break;
                case "debug":
                    enabled = logger.isDebugEnabled();
                    break;
                case "info":
                    enabled = logger.isInfoEnabled();
                    break;
                case "warn":
                    enabled = logger.isWarnEnabled();
                    break;
                case "error":
                    enabled = logger.isErrorEnabled();
                    break;
                default:
                    enabled = false;
            }

            if (enabled)
            {
                if (args.length == 0 || !(args[0] instanceof CharSequence))
                {
                    throw new IllegalArgumentException("First parameter to " + this.logMethodName + " must be a string");
                }

                final String message = String.valueOf(args[0]);

                Object[] realArgs = new Object[args.length - 1];
                Throwable t = args.length == 2 && args[1] instanceof Throwable ? (Throwable) args[1] : null;

                // first pass: conversion to abstractions (workaround for JDK-8137258)
                for (int idx = 0; idx < realArgs.length; idx++)
                {
                    if (args[idx + 1] instanceof ScriptObject)
                    {
                        realArgs[idx] = ScriptUtils.wrap((ScriptObject) args[idx + 1]);
                    }
                    else
                    {
                        realArgs[idx] = args[idx + 1];
                    }
                }

                // second pass: look for special cases for one additional argument
                if (realArgs.length == 1)
                {
                    if (realArgs[0] instanceof ScriptObjectMirror)
                    {
                        if (((ScriptObjectMirror) realArgs[0]).hasMember("nashornException"))
                        {
                            t = (Throwable) ((ScriptObjectMirror) realArgs[0]).getMember("nashornException");
                        }
                        // explode natively-provided array
                        else if (((ScriptObjectMirror) realArgs[0]).isArray())
                        {
                            final ScriptObjectMirror arr = (ScriptObjectMirror) realArgs[0];
                            realArgs = new Object[arr.size()];
                            for (int idx = 0; idx < realArgs.length; idx++)
                            {
                                realArgs[idx] = arr.getSlot(idx);
                            }
                        }
                    }
                }

                if (t != null)
                {
                    switch (this.logMethodName)
                    {
                        case "trace":
                            logger.trace(message, t);
                            break;
                        case "debug":
                            logger.debug(message, t);
                            break;
                        case "info":
                            logger.info(message, t);
                            break;
                        case "warn":
                            logger.warn(message, t);
                            break;
                        case "error":
                            logger.error(message, t);
                            break;
                        default: // NO-OP
                    }
                }
                else
                {
                    // third pass: turn script object into Java-toString-able wrappers
                    for (int idx = 0; idx < realArgs.length; idx++)
                    {
                        if (realArgs[idx] instanceof ScriptObjectMirror)
                        {
                            realArgs[idx] = new NativeLogMessageArgumentWrapper((ScriptObjectMirror) realArgs[idx]);
                        }
                    }

                    switch (this.logMethodName)
                    {
                        case "trace":
                            logger.trace(message, realArgs);
                            break;
                        case "debug":
                            logger.debug(message, realArgs);
                            break;
                        case "info":
                            logger.info(message, realArgs);
                            break;
                        case "warn":
                            logger.warn(message, realArgs);
                            break;
                        case "error":
                            logger.error(message, realArgs);
                            break;
                        default: // NO-OP
                    }
                }
            }

            return null;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public boolean isFunction()
        {
            return true;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public boolean isStrictFunction()
        {
            return true;
        }

    }

    protected static final Map<String, LogMethod> LOG_METHODS;

    protected static final Map<String, LogEnabledMethod> LOG_ENABLED_METHODS;

    static
    {
        final Map<String, LogMethod> logMethods = new HashMap<String, LogMethod>();
        final Map<String, LogEnabledMethod> logEnabledMethods = new HashMap<String, LogEnabledMethod>();

        for (final String methodName : Arrays
                .asList("isTraceEnabled", "isDebugEnabled", "isInfoEnabled", "isWarnEnabled", "isErrorEnabled"))
        {
            logEnabledMethods.put(methodName, new LogEnabledMethod(methodName));
        }

        for (final String methodName : Arrays.asList("trace", "debug", "info", "warn", "error"))
        {
            logMethods.put(methodName, new LogMethod(methodName));
        }

        LOG_METHODS = Collections.unmodifiableMap(logMethods);
        LOG_ENABLED_METHODS = Collections.unmodifiableMap(logEnabledMethods);
    }

    /**
     * Retrieves an instance of this wrapper encapsulating the logger of the given name.
     *
     * @param name
     *            the name of the logger to encapsulate
     * @return the native logger instance
     */
    public static NativeLogger getLogger(final String name)
    {
        return new NativeLogger(LoggerFactory.getLogger(name));
    }

    protected final Logger logger;

    protected NativeLogger(final Logger logger)
    {
        this.logger = logger;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        Object result;

        switch (name)
        {
            case "traceEnabled":
                result = Boolean.valueOf(this.logger.isTraceEnabled());
                break;
            case "debugEnabled":
                result = Boolean.valueOf(this.logger.isDebugEnabled());
                break;
            case "infoEnabled":
                result = Boolean.valueOf(this.logger.isInfoEnabled());
                break;
            case "warnEnabled":
                result = Boolean.valueOf(this.logger.isWarnEnabled());
                break;
            case "errorEnabled":
                result = Boolean.valueOf(this.logger.isErrorEnabled());
                break;
            // the following are like functions from a common prototype
            case "isTraceEnabled":
            case "isDebugEnabled":
            case "isInfoEnabled":
            case "isWarnEnabled":
            case "isErrorEnabled":
                result = LOG_ENABLED_METHODS.get(name);
                break;
            case "trace":
            case "debug":
            case "info":
            case "warn":
            case "error":
                result = LOG_METHODS.get(name);
                break;
            default:
                // TODO Is there a public scripting API constant for undefined?
                result = null;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public boolean hasMember(final String name)
    {
        boolean result;

        switch (name)
        {
            case "traceEnabled":
            case "debugEnabled":
            case "infoEnabled":
            case "warnEnabled":
            case "errorEnabled":
                result = true;
                break;
            default:
                result = false;
        }

        return result;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Set<String> keySet()
    {
        return new LinkedHashSet<String>(Arrays.asList("traceEnabled", "debugEnabled", "infoEnabled", "warnEnabled", "errorEnabled"));
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public Collection<Object> values()
    {
        final Collection<Object> values = new ArrayList<Object>();
        for (final String key : this.keySet())
        {
            values.add(this.getMember(key));
        }

        return values;
    }

    public Object getDefaultValue(final Class<?> hint)
    {
        Object defaultValue;
        if (String.class.equals(hint))
        {
            final StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.append("[");
            stringBuilder.append(this.getClassName());
            stringBuilder.append(" ");
            stringBuilder.append(this.logger.getName());
            stringBuilder.append("]");
            defaultValue = stringBuilder.toString();
        }
        else
        {
            defaultValue = super.getDefaultValue(hint);
        }

        return defaultValue;
    }
}
