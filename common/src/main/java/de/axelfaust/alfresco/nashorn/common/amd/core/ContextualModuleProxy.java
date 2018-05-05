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
package de.axelfaust.alfresco.nashorn.common.amd.core;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import de.axelfaust.alfresco.nashorn.common.amd.EnumBackedModuleFlags;
import de.axelfaust.alfresco.nashorn.common.amd.ModuleFlags;
import de.axelfaust.alfresco.nashorn.common.amd.SecureModuleException;
import jdk.nashorn.api.scripting.JSObject;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ContextualModuleProxy implements JSObject
{

    protected final ModuleSystem moduleSystem;

    protected final JSObject delegate;

    protected final ModuleHolder contextModule;

    protected final ModuleFlags flags;

    public ContextualModuleProxy(final ModuleSystem moduleSystem, final JSObject delegate, final ModuleHolder contextModule,
            final ModuleFlags flags)
    {
        this.moduleSystem = moduleSystem;
        this.delegate = delegate;
        this.contextModule = contextModule;
        this.flags = flags;
    }

    /**
     * Retrieves the backing delegate of this proxy.
     *
     * @return the delegate
     */
    public JSObject getDelegate()
    {
        return this.delegate;
    }

    /**
     * Retrieves the module flags in effect for the delegate of this proxy.
     *
     * @return the flags
     */
    public ModuleFlags getFlags()
    {
        return this.flags;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object call(final Object thiz, final Object... args)
    {
        Object callResult = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.call(thiz, args);
        });

        callResult = this.handleReadValue(callResult, args);

        return callResult;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object newObject(final Object... args)
    {
        Object ctorResult = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.newObject(args);
        });

        ctorResult = this.handleReadValue(ctorResult, null);

        return ctorResult;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object eval(final String s)
    {
        Object evalResult = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.eval(s);
        });

        evalResult = this.handleReadValue(evalResult, null);

        return evalResult;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getMember(final String name)
    {
        Object member = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.getMember(name);
        });

        member = this.handleReadValue(member, name);

        return member;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object getSlot(final int index)
    {
        Object slotValue = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.getSlot(index);
        });

        slotValue = this.handleReadValue(slotValue, Integer.valueOf(index));

        return slotValue;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean hasMember(final String name)
    {
        final boolean hasMember = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.hasMember(name);
        });
        return hasMember;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean hasSlot(final int slot)
    {
        final boolean hasSlot = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.hasSlot(slot);
        });
        return hasSlot;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void removeMember(final String name)
    {
        ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            this.delegate.removeMember(name);
            return null;
        });
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void setMember(final String name, final Object value)
    {
        ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            this.delegate.setMember(name, value);
            return null;
        });
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void setSlot(final int index, final Object value)
    {
        ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            this.delegate.setSlot(index, value);
            return null;
        });
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Set<String> keySet()
    {
        final Set<String> keySet = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.keySet();
        });
        return keySet;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Collection<Object> values()
    {
        final Collection<Object> values = ModuleSystem.withTaggedCallerContextModule(this.contextModule, () -> {
            return this.delegate.values();
        });

        Collection<Object> returnableValues;

        if (values instanceof Set<?>)
        {
            returnableValues = new HashSet<>();
        }
        else
        {
            returnableValues = new ArrayList<>();
        }

        values.forEach(value -> {
            final Object returnableValue = this.handleReadValue(value, null);
            returnableValues.add(returnableValue);
        });

        return returnableValues;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isInstance(final Object instance)
    {
        return this.delegate.isInstance(instance);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isInstanceOf(final Object clazz)
    {
        return this.delegate.isInstanceOf(clazz);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getClassName()
    {
        return this.delegate.getClassName();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isFunction()
    {
        return this.delegate.isFunction();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isStrictFunction()
    {
        return this.delegate.isStrictFunction();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean isArray()
    {
        return this.delegate.isArray();
    }

    /**
     * {@inheritDoc}
     */
    @Deprecated
    @Override
    public double toNumber()
    {
        return this.delegate.toNumber();
    }

    protected Object handleReadValue(final Object value, final Object memberSlotId)
    {
        Object resultValue = value;
        if (value instanceof ContextualModuleProxy)
        {
            // we are crossing a context, so need to re-wrap the delegate
            resultValue = new ContextualModuleProxy(this.moduleSystem, ((ContextualModuleProxy) value).getDelegate(), this.contextModule,
                    ((ContextualModuleProxy) value).getFlags());
        }
        else if (value instanceof JSObject)
        {
            // some other, native-like object, so need to wrap
            final ModuleFlags flags = EnumBackedModuleFlags.fromJSObject((JSObject) value);
            if (flags != null && flags.requiresSecureCaller() && !this.contextModule.isFromSecureSource())
            {
                if (memberSlotId != null)
                {
                    throw new SecureModuleException("Value of member/slot '{}' cannot be accessed by insecure module '{}'", memberSlotId,
                            this.contextModule.getNormalizedModuleId());
                }
                else
                {
                    throw new SecureModuleException("Result value cannot be accessed by insecure module '{}'",
                            this.contextModule.getNormalizedModuleId());
                }
            }
            // inherit flags from this if none defined (members are part of module - different for function results)
            resultValue = new ContextualModuleProxy(this.moduleSystem, (JSObject) value, this.contextModule,
                    flags != null ? flags : this.flags);
        }
        return resultValue;
    }

}
