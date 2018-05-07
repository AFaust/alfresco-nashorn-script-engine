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
package de.axelfaust.alfresco.nashorn.common.util;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class LambdaJavaScriptFunction extends AbstractJavaScriptObject
{

    @FunctionalInterface
    public interface CallFunction
    {

        Object call(Object thiz, Object... args);
    }

    @FunctionalInterface
    public interface ConstructorFunction
    {

        Object newObject(Object... args);
    }

    protected final CallFunction callFunction;

    protected final ConstructorFunction constructorFunction;

    public LambdaJavaScriptFunction(final CallFunction callFunction)
    {
        this(callFunction, null);
    }

    public LambdaJavaScriptFunction(final CallFunction callFunction, final ConstructorFunction constructorFunction)
    {
        ParameterCheck.mandatory("callFunction", callFunction);
        this.callFunction = callFunction;
        this.constructorFunction = constructorFunction;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object call(final Object thiz, final Object... args)
    {
        final Object[] correctArgs = this.correctArgsAbstraction(args);
        final Object result = this.callFunction.call(thiz, correctArgs);
        return result;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Object newObject(final Object... args)
    {
        final Object[] correctArgs = this.correctArgsAbstraction(args);
        final Object result = this.constructorFunction != null ? this.constructorFunction.newObject(correctArgs)
                : super.newObject(correctArgs);
        return result;
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

    /**
     * Sets a member of this function from Java callers. This API operation does not allow mutation from JavaScript code and is intended for
     * Java code to properly initialise this function before exposing it to a JavaScript context.
     *
     * @param member
     *            the name of the member to set
     * @param value
     *            the value of the member
     * @param enumerable
     *            {@code true} if the member should be enumerable, {@code false} otherwise
     */
    public void setMember(final String member, final Object value, final boolean enumerable)
    {
        super.setMemberImpl(member, value, enumerable);
    }
}
