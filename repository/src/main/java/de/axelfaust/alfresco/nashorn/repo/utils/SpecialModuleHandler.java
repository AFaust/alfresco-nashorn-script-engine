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
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jdk.nashorn.api.scripting.AbstractJSObject;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class SpecialModuleHandler extends AbstractJSObject
{

    /**
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface WithTaggedCaller
    {

        /**
         * Executes a function within a specific caller context
         *
         * @param callback
         *            the callback function to execute
         * @param url
         *            the script URL of the specific caller
         */
        void withTaggedCaller(WithTaggedCallerCallback callback, String url);
    }

    /**
     * @author Axel Faust
     */
    @FunctionalInterface
    public static interface WithTaggedCallerCallback
    {

        /**
         * Executes this callback
         */
        void callback();
    }

    protected static boolean getBoolean(final JSObject delegate, final String member)
    {
        boolean result;

        if (delegate.hasMember(member))
        {
            final Object memberValue = delegate.getMember(member);
            result = Boolean.TRUE.equals(memberValue);
        }
        else
        {
            result = false;
        }

        return result;
    }

    private static final Logger LOGGER = LoggerFactory.getLogger(SpecialModuleHandler.class);

    protected final JSObject delegate;

    protected final boolean callerTagged;

    protected final boolean callerProvided;

    protected final boolean isFunction;

    protected final String callerUrl;

    protected final WithTaggedCaller withTaggedCallerFn;

    protected transient final Map<String, Object> cachedMembers = new HashMap<>();

    protected transient final Map<Integer, Object> cachedSlots = new HashMap<>();

    protected JSObject originalThis;

    protected SpecialModuleHandler jsObjectThis;

    public SpecialModuleHandler(final JSObject delegate, final boolean callerProvided, final boolean callerTagged, final String callerUrl,
            final WithTaggedCaller withTaggedCallerFn)
    {
        LOGGER.debug("Constructing special module handler for {} - callerProvided: {}, callerTagged: {}, caller: {}",
                delegate.isFunction() ? delegate.getMember("name") : new NativeLogMessageArgumentWrapper(delegate), callerProvided,
                callerTagged, callerUrl);

        this.delegate = delegate;

        this.callerProvided = callerProvided;
        this.callerTagged = callerTagged;
        this.callerUrl = callerUrl;
        this.isFunction = delegate.isFunction();
        this.withTaggedCallerFn = withTaggedCallerFn;
    }

    public SpecialModuleHandler(final JSObject delegate, final JSObject descriptor, final String callerUrl,
            final WithTaggedCaller withTaggedCallerFn)
    {
        this(delegate, getBoolean(descriptor, "callerProvided"), getBoolean(descriptor, "callerTagged"), callerUrl, withTaggedCallerFn);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object newObject(final Object... args)
    {
        if (!this.isFunction)
        {
            throw new UnsupportedOperationException("delegate is not a function - unable to instantiate object");
        }

        LOGGER.debug("Handling new on {}",
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // in case a Java-based operation is wrapped that may check type of argument, unwrap any arguments of our type
        for (int i = 0; i < args.length; i++)
        {
            if (args[i] instanceof SpecialModuleHandler)
            {
                args[i] = ((SpecialModuleHandler) args[i]).getDelegate();
            }
        }

        final Object[] effectiveArguments;
        if (this.callerProvided)
        {
            LOGGER.debug("Prefixing callerUrl {} to arguments", this.callerUrl);
            effectiveArguments = new Object[args.length + 1];
            effectiveArguments[0] = this.callerUrl;
            System.arraycopy(args, 0, effectiveArguments, 1, args.length);
        }
        else
        {
            effectiveArguments = args;
        }

        final AtomicReference<Object> resultRef = new AtomicReference<>();
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                resultRef.set(this.delegate.newObject(effectiveArguments));
            }, this.callerUrl);
        }
        else
        {
            resultRef.set(this.delegate.newObject(effectiveArguments));
        }

        final Object result = resultRef.get();

        LOGGER.debug("new yielded {}", result instanceof JSObject ? (((JSObject) result).isFunction()
                ? ((JSObject) result).getMember("name") : new NativeLogMessageArgumentWrapper((JSObject) result)) : result);

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object call(final Object thiz, final Object... args)
    {
        if (!this.isFunction)
        {
            throw new UnsupportedOperationException("delegate is not a function - unable to call");
        }

        LOGGER.debug("Handling call on {}",
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        final Object effectiveThis;
        if (thiz == null || thiz == this.jsObjectThis)
        {
            effectiveThis = this.originalThis;
        }
        else
        {
            effectiveThis = thiz;
        }

        // in case a Java-based operation is wrapped that may check type of argument, unwrap any arguments of our type
        for (int i = 0; i < args.length; i++)
        {
            if (args[i] instanceof SpecialModuleHandler)
            {
                args[i] = ((SpecialModuleHandler) args[i]).getDelegate();
            }
        }

        final Object[] effectiveArguments;
        if (this.callerProvided)
        {
            LOGGER.debug("Prefixing callerUrl {} to arguments", this.callerUrl);
            effectiveArguments = new Object[args.length + 1];
            effectiveArguments[0] = this.callerUrl;
            System.arraycopy(args, 0, effectiveArguments, 1, args.length);
        }
        else
        {
            effectiveArguments = args;
        }

        final AtomicReference<Object> resultRef = new AtomicReference<>();
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                resultRef.set(this.delegate.call(effectiveThis, effectiveArguments));
            }, this.callerUrl);
        }
        else
        {
            resultRef.set(this.delegate.call(effectiveThis, effectiveArguments));
        }

        final Object result = resultRef.get();

        LOGGER.debug("call yielded {}", result instanceof JSObject ? (((JSObject) result).isFunction()
                ? ((JSObject) result).getMember("name") : new NativeLogMessageArgumentWrapper((JSObject) result)) : result);

        // any cached member / slot data may have changed due to function call
        if (this.jsObjectThis != null)
        {
            this.jsObjectThis.resetCaches();
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object eval(final String s)
    {
        LOGGER.debug("Handling __eval__ on {} with s: {} ",
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate), s);

        // can't handle callerProvided for eval
        final AtomicReference<Object> resultRef = new AtomicReference<>();
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                resultRef.set(this.delegate.eval(s));
            }, this.callerUrl);
        }
        else
        {
            resultRef.set(this.delegate.eval(s));
        }

        final Object result = resultRef.get();

        LOGGER.debug("eval yielded {}", result instanceof JSObject ? (((JSObject) result).isFunction()
                ? ((JSObject) result).getMember("name") : new NativeLogMessageArgumentWrapper((JSObject) result)) : result);

        // any cached member / slot data may have changed due to function call
        if (this.jsObjectThis != null)
        {
            this.jsObjectThis.resetCaches();
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        LOGGER.debug("Handling getMember {} on {}", name,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        Object result;
        if (this.cachedMembers.containsKey(name))
        {
            LOGGER.trace("Reusing cached member");
            result = this.cachedMembers.get(name);
        }
        else
        {
            // can't handle callerProvided for getMember
            final AtomicReference<Object> resultRef = new AtomicReference<>();
            if (this.callerTagged)
            {
                LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
                this.withTaggedCallerFn.withTaggedCaller(() -> {
                    resultRef.set(this.delegate.getMember(name));
                }, this.callerUrl);
            }
            else
            {
                resultRef.set(this.delegate.getMember(name));
            }

            result = resultRef.get();

            LOGGER.debug("getMember {} yielded {}", name, result instanceof JSObject ? (((JSObject) result).isFunction()
                    ? ((JSObject) result).getMember("name") : new NativeLogMessageArgumentWrapper((JSObject) result)) : result);

            if (result instanceof JSObject)
            {
                final JSObject scriptResult = (JSObject) result;
                if ((scriptResult.isFunction() || (!scriptResult.isArray() && !ScriptObjectMirror.isUndefined(scriptResult)))
                        && !Boolean.FALSE.equals(scriptResult.getMember("_specialHandling")))
                {
                    LOGGER.debug("Wrapping function result {} of getMember in special module handler",
                            scriptResult.isFunction() ? scriptResult.getMember("name") : new NativeLogMessageArgumentWrapper(scriptResult));
                    result = new SpecialModuleHandler(scriptResult, this.callerProvided, this.callerTagged, this.callerUrl,
                            this.withTaggedCallerFn);
                    if (scriptResult.isFunction())
                    {
                        ((SpecialModuleHandler) result).setThis(this.delegate, this);
                    }
                }
            }

            this.cachedMembers.put(name, result);
        }
        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getSlot(final int slot)
    {
        LOGGER.debug("Handling getSlot {} on {}", slot,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        Object result;
        if (this.cachedSlots.containsKey(Integer.valueOf(slot)))
        {
            result = this.cachedSlots.get(Integer.valueOf(slot));
        }
        else
        {
            // can't handle callerProvided for getSlot
            final AtomicReference<Object> resultRef = new AtomicReference<>();
            if (this.callerTagged)
            {
                LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
                this.withTaggedCallerFn.withTaggedCaller(() -> {
                    resultRef.set(this.delegate.getSlot(slot));
                }, this.callerUrl);
            }
            else
            {
                resultRef.set(this.delegate.getSlot(slot));
            }

            result = resultRef.get();

            LOGGER.debug("getSlot {} yielded {}", slot, result instanceof JSObject ? (((JSObject) result).isFunction()
                    ? ((JSObject) result).getMember("name") : new NativeLogMessageArgumentWrapper((JSObject) result)) : result);

            if (result instanceof JSObject)
            {
                final JSObject scriptResult = (JSObject) result;
                if ((scriptResult.isFunction() || (!scriptResult.isArray() && !ScriptObjectMirror.isUndefined(scriptResult)))
                        && !Boolean.FALSE.equals(scriptResult.getMember("_specialHandling")))
                {
                    LOGGER.debug("Wrapping function result {} of getSlot in special module handler",
                            scriptResult.isFunction() ? scriptResult.getMember("name") : new NativeLogMessageArgumentWrapper(scriptResult));
                    result = new SpecialModuleHandler(scriptResult, this.callerProvided, this.callerTagged, this.callerUrl,
                            this.withTaggedCallerFn);
                    if (scriptResult.isFunction())
                    {
                        ((SpecialModuleHandler) result).setThis(this.delegate, this);
                    }
                }
            }
            this.cachedSlots.put(Integer.valueOf(slot), result);
        }
        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean hasMember(final String name)
    {
        LOGGER.debug("Handling hasMember {} on {}", name,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        final boolean result;

        if (this.cachedMembers.containsKey(name))
        {
            result = true;
        }
        else
        {
            // can't handle callerProvided for hasMember
            final AtomicBoolean resultRef = new AtomicBoolean();
            if (this.callerTagged)
            {
                LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
                this.withTaggedCallerFn.withTaggedCaller(() -> {
                    resultRef.set(this.delegate.hasMember(name));
                }, this.callerUrl);
            }
            else
            {
                resultRef.set(this.delegate.hasMember(name));
            }

            result = resultRef.get();
            LOGGER.debug("hasMember {} yielded {}", name, result);
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean hasSlot(final int slot)
    {
        LOGGER.debug("Handling hasSlot {} on {}", slot,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        final boolean result;

        if (this.cachedSlots.containsKey(Integer.valueOf(slot)))
        {
            result = true;
        }
        else
        {
            // can't handle callerProvided for hasSlot
            final AtomicBoolean resultRef = new AtomicBoolean();
            if (this.callerTagged)
            {
                LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
                this.withTaggedCallerFn.withTaggedCaller(() -> {
                    resultRef.set(this.delegate.hasSlot(slot));
                }, this.callerUrl);
            }
            else
            {
                resultRef.set(this.delegate.hasSlot(slot));
            }

            result = resultRef.get();

            LOGGER.debug("hasSlot {} yielded {}", slot, result);
        }

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void removeMember(final String name)
    {
        LOGGER.debug("Handling removeMember {} on {}", name,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // can't handle callerProvided for removeMember
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                this.delegate.removeMember(name);
            }, this.callerUrl);
        }
        else
        {
            this.delegate.removeMember(name);
        }

        this.cachedMembers.remove(name);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void setMember(final String name, final Object value)
    {
        LOGGER.debug("Handling setMember {} on {}", name,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // can't handle callerProvided for setMember
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                this.delegate.setMember(name, value);
            }, this.callerUrl);
        }
        else
        {
            this.delegate.setMember(name, value);
        }

        this.cachedMembers.remove(name);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void setSlot(final int slot, final Object value)
    {
        LOGGER.debug("Handling setSlot {} on {}", slot,
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // can't handle callerProvided for setSlot
        if (this.callerTagged)
        {
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                this.delegate.setSlot(slot, value);
            }, this.callerUrl);
        }
        else
        {
            this.delegate.setSlot(slot, value);
        }

        this.cachedSlots.remove(Integer.valueOf(slot));
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Set<String> keySet()
    {
        LOGGER.debug("Handling keySet on {}",
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // can't handle callerProvided for keySet
        final AtomicReference<Set<String>> resultRef = new AtomicReference<>();
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                resultRef.set(this.delegate.keySet());
            }, this.callerUrl);
        }
        else
        {
            resultRef.set(this.delegate.keySet());
        }

        final Set<String> result = resultRef.get();

        LOGGER.debug("keySet yielded {}", result);

        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Collection<Object> values()
    {
        LOGGER.debug("Handling values on {}",
                this.delegate.isFunction() ? this.delegate.getMember("name") : new NativeLogMessageArgumentWrapper(this.delegate));

        // can't handle callerProvided for values
        final AtomicReference<Collection<Object>> resultRef = new AtomicReference<>();
        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                resultRef.set(this.delegate.values());
            }, this.callerUrl);
        }
        else
        {
            resultRef.set(this.delegate.values());
        }

        final Collection<Object> result = resultRef.get();

        LOGGER.debug("values yielded {}", result);

        final List<Object> resultList = new ArrayList<>();
        for (final Object resultElement : result)
        {
            if (resultElement instanceof JSObject)
            {
                final JSObject scriptResult = (JSObject) resultElement;
                if ((scriptResult.isFunction() || (!scriptResult.isArray() && !ScriptObjectMirror.isUndefined(scriptResult)))
                        && !Boolean.FALSE.equals(scriptResult.getMember("_specialHandling")))
                {
                    LOGGER.debug("Wrapping function result {} of values in special module handler",
                            scriptResult.isFunction() ? scriptResult.getMember("name") : new NativeLogMessageArgumentWrapper(scriptResult));
                    final Object resultElementMod = new SpecialModuleHandler(scriptResult, this.callerProvided, this.callerTagged,
                            this.callerUrl, this.withTaggedCallerFn);
                    if (scriptResult.isFunction())
                    {
                        ((SpecialModuleHandler) resultElementMod).setThis(this.delegate, this);
                    }
                    resultList.add(resultElementMod);
                }
                else
                {
                    resultList.add(resultElement);
                }
            }
            else
            {
                resultList.add(resultElement);
            }
        }

        return resultList;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isInstance(final Object instance)
    {
        final boolean isInstance = this.delegate.isInstance(instance);
        return isInstance;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isInstanceOf(final Object clazz)
    {
        final boolean isInstanceOf = this.delegate.isInstanceOf(clazz);
        return isInstanceOf;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getClassName()
    {
        final String className = this.delegate.getClassName();
        return className;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isFunction()
    {
        return this.isFunction;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isStrictFunction()
    {
        final boolean strictFunction = this.delegate.isStrictFunction();
        return strictFunction;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isArray()
    {
        final boolean array = this.delegate.isArray();
        return array;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public double toNumber()
    {
        // can't handle callerProvided for toNumber
        final AtomicReference<Double> resultRef = new AtomicReference<>();

        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                @SuppressWarnings("deprecation")
                final double number = this.delegate.toNumber();
                resultRef.set(Double.valueOf(number));
            }, this.callerUrl);
        }
        else
        {
            @SuppressWarnings("deprecation")
            final double number = this.delegate.toNumber();
            resultRef.set(Double.valueOf(number));
        }

        final double number = resultRef.get().doubleValue();
        return number;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getDefaultValue(final Class<?> hint)
    {
        // can't handle callerProvided for getDefaultValue
        final AtomicReference<Object> resultRef = new AtomicReference<>();

        if (this.callerTagged)
        {
            LOGGER.debug("Tagging callerUrl {}", this.callerUrl);
            this.withTaggedCallerFn.withTaggedCaller(() -> {
                if (this.delegate instanceof AbstractJSObject)
                {
                    resultRef.set(((AbstractJSObject) this.delegate).getDefaultValue(hint));
                }
                else if (Number.class.isAssignableFrom(hint))
                {
                    @SuppressWarnings("deprecation")
                    final double number = this.delegate.toNumber();
                    resultRef.set(Double.valueOf(number));
                }
                else if (CharSequence.class.isAssignableFrom(hint))
                {
                    final Object toString = this.delegate.getMember("toString");
                    if (toString instanceof JSObject && ((JSObject) toString).isFunction())
                    {
                        resultRef.set(((JSObject) toString).call(this.delegate));
                    }
                }
            }, this.callerUrl);
        }
        else
        {
            if (this.delegate instanceof AbstractJSObject)
            {
                resultRef.set(((AbstractJSObject) this.delegate).getDefaultValue(hint));
            }
            else if (Number.class.isAssignableFrom(hint))
            {
                @SuppressWarnings("deprecation")
                final double number = this.delegate.toNumber();
                resultRef.set(Double.valueOf(number));
            }
            else if (CharSequence.class.isAssignableFrom(hint))
            {
                final Object toString = this.delegate.getMember("toString");
                if (toString instanceof JSObject && ((JSObject) toString).isFunction())
                {
                    resultRef.set(((JSObject) toString).call(this.delegate));
                }
            }
        }

        final Object result = resultRef.get();
        return result;
    }

    protected void resetCaches()
    {
        this.cachedMembers.clear();
        this.cachedSlots.clear();
    }

    protected JSObject getDelegate()
    {
        return this.delegate;
    }

    protected void setThis(final JSObject originalThis, final SpecialModuleHandler jsObjectThis)
    {
        this.originalThis = originalThis;
        this.jsObjectThis = jsObjectThis;
    }
}
