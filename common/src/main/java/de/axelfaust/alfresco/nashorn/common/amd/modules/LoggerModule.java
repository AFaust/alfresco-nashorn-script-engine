/*
 * Copyright 2017 Axel Faust
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
package de.axelfaust.alfresco.nashorn.common.amd.modules;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.axelfaust.alfresco.nashorn.common.amd.core.ModuleSystem;
import de.axelfaust.alfresco.nashorn.common.util.AbstractJavaScriptObject;
import de.axelfaust.alfresco.nashorn.common.util.LambdaJavaScriptFunction;
import de.axelfaust.alfresco.nashorn.common.util.ParameterCheck;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptUtils;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class LoggerModule extends AbstractJavaScriptObject
{

    private static final Map<String, Logger> LOGGER_LOOKUP = new HashMap<>();

    /**
     *
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface NormalizedContextModuleIdProvider
    {

        /**
         * Retrieves the normalised module ID of the {@link ModuleSystem#getCallerContextScriptUrl() current context}.
         *
         * @return the normalised module ID of the context or {@code null} if currently called from the global context
         */
        String getNormalisedContextModuleId();
    }

    /**
     *
     * @author Axel Faust
     */
    protected static class JSObjectLogArgumentWrapper
    {

        protected final JSObject delegate;

        protected JSObjectLogArgumentWrapper(final JSObject delegate)
        {
            this.delegate = delegate;
        }

        /**
         *
         * {@inheritDoc}
         */
        @Override
        public String toString()
        {
            final Object converted = ScriptUtils.convert(this.delegate, String.class);
            return String.valueOf(converted);
        }
    }

    protected final NormalizedContextModuleIdProvider normalizedContextModuleIdProvider;

    public LoggerModule(final NormalizedContextModuleIdProvider normalizedContextModuleIdProvider)
    {
        ParameterCheck.mandatory("normalizedContextModuleIdProvider", normalizedContextModuleIdProvider);
        this.normalizedContextModuleIdProvider = normalizedContextModuleIdProvider;

        final LambdaJavaScriptFunction isTraceEnabled = new LambdaJavaScriptFunction((thiz, args) -> {
            return this.getApplicableLogger().isTraceEnabled();
        });
        this.setMemberImpl("isTraceEnabled", isTraceEnabled, false);
        final LambdaJavaScriptFunction trace = new LambdaJavaScriptFunction((thiz, args) -> {
            this.logWithArguments((message, arguments) -> {
                this.getApplicableLogger().trace(message, arguments);
            }, "trace", args);
            return null;
        });
        this.setMemberImpl("trace", trace, false);

        final LambdaJavaScriptFunction isDebugEnabled = new LambdaJavaScriptFunction((thiz, args) -> {
            return this.getApplicableLogger().isDebugEnabled();
        });
        this.setMemberImpl("isDebugEnabled", isDebugEnabled, false);
        final LambdaJavaScriptFunction debug = new LambdaJavaScriptFunction((thiz, args) -> {
            this.logWithArguments((message, arguments) -> {
                this.getApplicableLogger().debug(message, arguments);
            }, "debug", args);
            return null;
        });
        this.setMemberImpl("debug", debug, false);

        final LambdaJavaScriptFunction isInfoEnabled = new LambdaJavaScriptFunction((thiz, args) -> {
            return this.getApplicableLogger().isInfoEnabled();
        });
        this.setMemberImpl("isInfoEnabled", isInfoEnabled, false);
        final LambdaJavaScriptFunction info = new LambdaJavaScriptFunction((thiz, args) -> {
            this.logWithArguments((message, arguments) -> {
                this.getApplicableLogger().info(message, arguments);
            }, "info", args);
            return null;
        });
        this.setMemberImpl("info", info, false);

        final LambdaJavaScriptFunction isWarnEnabled = new LambdaJavaScriptFunction((thiz, args) -> {
            return this.getApplicableLogger().isWarnEnabled();
        });
        this.setMemberImpl("isWarnEnabled", isWarnEnabled, false);
        final LambdaJavaScriptFunction warn = new LambdaJavaScriptFunction((thiz, args) -> {
            this.logWithArguments((message, arguments) -> {
                this.getApplicableLogger().warn(message, arguments);
            }, "warn", args);
            return null;
        });
        this.setMemberImpl("warn", warn, false);

        final LambdaJavaScriptFunction isErrorEnabled = new LambdaJavaScriptFunction((thiz, args) -> {
            return this.getApplicableLogger().isErrorEnabled();
        });
        this.setMemberImpl("isErrorEnabled", isErrorEnabled, false);
        final LambdaJavaScriptFunction error = new LambdaJavaScriptFunction((thiz, args) -> {
            this.logWithArguments((message, arguments) -> {
                this.getApplicableLogger().error(message, arguments);
            }, "error", args);
            return null;
        });
        this.setMemberImpl("error", error, false);
    }

    protected void logWithArguments(final BiConsumer<String, Object[]> logMethod, final String logMethodName, final Object... args)
    {
        if (args.length == 0)
        {
            throw new IllegalArgumentException("'" + logMethodName + "' requires at least a 'message' / 'error' parameter");
        }

        String message;
        Throwable t = null;
        if (args[0] instanceof JSObject)
        {
            final JSObject firstArg = (JSObject) args[0];
            if (this.isNativeError(firstArg))
            {
                // Error.prototype.stack would be better to log from a script perspective but no Java log framework supports for two
                // printable String messages per log call, so we stick to the underlying Java exception
                message = String.valueOf(firstArg.eval("this.toString();"));
                t = (Throwable) firstArg.getMember("nashornException");
            }
            else
            {
                message = String.valueOf(ScriptUtils.convert(firstArg, String.class));
            }
        }
        else if (args[0] instanceof Throwable)
        {
            message = null;
            t = (Throwable) args[0];
        }
        else if (args[0] != null)
        {
            message = String.valueOf(args[0]);
        }
        else
        {
            message = null;
        }

        final Object[] logArguments = this.processLogArguments(t, args);

        logMethod.accept(message, logArguments);
    }

    protected Object[] processLogArguments(Throwable t, final Object... args)
    {
        // treat like call to SLF4J logger with (String, Object...) arguments
        final List<Object> realArgs;

        // for native errors, Error.prototype.stack would be better to log but no Java log framework supports for two
        // printable String messages per log call, so we stick to the underlying Java exception and incluude native error in arguments for
        // message formatting

        // any throwable should always be last argument - convention in SLF4J multi-parameter log methods is to treat Throwable in last
        // position as if explicit call was made to method with throwable in signature

        if (args.length == 2 && args[1] instanceof JSObject && ((JSObject) args[1]).isArray())
        {
            // like call to SLF4J logger with (String, Object[]) arguments
            // explode into realArgs list
            final JSObject arguments = (JSObject) args[1];
            final int argumentsLength = ParameterCheck.mandatoryNativeArray("arguments", arguments);
            realArgs = new ArrayList<>(argumentsLength + 1);
            for (int argIdx = 0; argIdx < argumentsLength; argIdx++)
            {
                final Object slotValue = arguments.hasSlot(argIdx) ? arguments.getSlot(argIdx) : null;
                realArgs.add(slotValue);
                if (argIdx == argumentsLength - 1)
                {
                    if (this.isNativeError(slotValue))
                    {
                        t = (Throwable) ((JSObject) slotValue).getMember("nashornException");
                    }
                    // need to treat Java error similar to native error
                    // (consistent client-side behaviour / expectations)
                    else if (slotValue instanceof Throwable)
                    {
                        t = (Throwable) slotValue;
                    }
                }
            }

            if (t != null)
            {
                realArgs.add(t);
            }
        }
        else
        {
            // like call to SLF4J logger with (String, Object...) arguments
            realArgs = new ArrayList<>(args.length);
            for (int argIdx = 1; argIdx < args.length; argIdx++)
            {
                realArgs.add(args[argIdx]);
                if (argIdx == args.length - 1)
                {
                    if (this.isNativeError(args[argIdx]))
                    {
                        t = (Throwable) ((JSObject) args[argIdx]).getMember("nashornException");
                    }
                    // need to treat Java error similar to native error
                    // (consistent client-side behaviour / expectations)
                    else if (args[argIdx] instanceof Throwable)
                    {
                        t = (Throwable) args[argIdx];
                    }
                }
            }

            if (t != null)
            {
                realArgs.add(t);
            }
        }

        final Object[] logArguments = realArgs.stream().map(arg -> {
            Object effectiveArg = arg;
            if (effectiveArg instanceof JSObject)
            {
                effectiveArg = new JSObjectLogArgumentWrapper((JSObject) effectiveArg);
            }
            return effectiveArg;
        }).toArray(size -> {
            return new Object[size];
        });
        return logArguments;
    }

    protected Logger getApplicableLogger()
    {
        final String normalizedModuleId = this.normalizedContextModuleIdProvider.getNormalisedContextModuleId();
        final Logger logger = LOGGER_LOOKUP.computeIfAbsent(normalizedModuleId, (moduleId) -> {
            final StringBuilder loggerNameBuilder = new StringBuilder(LoggerModule.class.getName());
            loggerNameBuilder.append(".scripts");
            if (normalizedModuleId != null)
            {
                if (normalizedModuleId.indexOf('!') == -1)
                {
                    loggerNameBuilder.append(".-defaultLoader-");
                }
                final String[] nameFragments = normalizedModuleId.split("[\\!\\/]");
                for (final String nameFragment : nameFragments)
                {
                    loggerNameBuilder.append('.').append(nameFragment);
                }
            }
            else
            {
                loggerNameBuilder.append(".-global-");
            }

            final String loggerName = loggerNameBuilder.toString();
            final Logger computedLogger = LoggerFactory.getLogger(loggerName);
            return computedLogger;
        });
        return logger;
    }

    protected boolean isNativeError(final Object obj)
    {
        final boolean isNativeError = obj instanceof JSObject && "Error".equals(((JSObject) obj).getClassName())
                && ((JSObject) obj).hasMember("nashornException");
        return isNativeError;
    }
}
