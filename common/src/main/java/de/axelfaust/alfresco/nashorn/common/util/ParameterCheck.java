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

import java.math.BigInteger;
import java.util.Collection;
import java.util.Map;

import jdk.nashorn.api.scripting.JSObject;

/**
 * This utility contains parameter check methods similar to the Alfresco {@code org.alfresco.util.ParameterCheck} class, and added checks
 * specific to this module. The copied methods have been duplicated to avoid this module / project having unnecessary dependencies to the
 * {@code alfresco-core} module (including its transitive dependencies), only for the ability to validate parameters.
 *
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public final class ParameterCheck
{

    private ParameterCheck()
    {
        // NO-OP
    }

    /**
     * Checks that the parameter with the given name has content i.e. it is not
     * null
     *
     * @param strParamName
     *            Name of parameter to check
     * @param object
     *            Value of the parameter to check
     */
    public static final void mandatory(final String strParamName, final Object object)
    {
        if (object == null)
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null value");
        }
    }

    /**
     * Checks that the parameter with the given name is not null and has a positive integer value
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            Value of the parameter to check
     */
    public static final void mandatoryPositiveInteger(final String strParamName, final Object value)
    {
        if (value == null && !(value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte
                || value instanceof BigInteger))
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-negative integer value");
        }
        positiveInteger(strParamName, ((Number) value).longValue());
    }

    /**
     * Checks that the parameter with the given name is not null and has a non-negative integer value
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            Value of the parameter to check
     */
    public static final void mandatoryNonNegativeInteger(final String strParamName, final Object value)
    {
        if (value == null && !(value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte
                || value instanceof BigInteger))
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-negative integer value");
        }
        nonNegativeInteger(strParamName, ((Number) value).longValue());
    }

    /**
     * Checks that the parameter with the given name has a positive integer value
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            Value of the parameter to check
     */
    public static final void positiveInteger(final String strParamName, final long value)
    {
        if (value < 0)
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, positive integer value");
        }
    }

    /**
     * Checks that the parameter with the given name has a positive integer value
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            Value of the parameter to check
     */
    public static final void nonNegativeInteger(final String strParamName, final long value)
    {
        if (value <= 0)
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, positive integer value");
        }
    }

    /**
     * Checks that the string parameter with the given name has content i.e. it
     * is not null and not zero length
     *
     * @param strParamName
     *            Name of parameter to check
     * @param strParamValue
     *            Value of the parameter to check
     */
    public static final void mandatoryString(final String strParamName, final String strParamValue)
    {
        if (strParamValue == null || strParamValue.trim().isEmpty())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-empty string");
        }
    }

    /**
     * Checks that the string parameter with the given name is either null or has content i.e. it
     * is not zero length
     *
     * @param strParamName
     *            Name of parameter to check
     * @param strParamValue
     *            Value of the parameter to check
     */
    public static final void nonEmptyString(final String strParamName, final String strParamValue)
    {
        if (strParamValue != null && strParamValue.trim().isEmpty())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-empty string or null");
        }
    }

    /**
     * Checks that the string parameter with the given name has content i.e. it
     * is not null and not zero length
     *
     * @param strParamName
     *            Name of parameter to check
     * @param strParamValue
     *            Value of the parameter to check
     */
    public static final void mandatoryCharSequence(final String strParamName, final Object strParamValue)
    {
        if (strParamValue == null || !(strParamValue instanceof CharSequence) || ((CharSequence) strParamValue).toString().trim().isEmpty())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-empty string");
        }
    }

    /**
     * Checks that the collection parameter contains at least one item.
     *
     * @param strParamName
     *            Name of parameter to check
     * @param coll
     *            collection to check
     */
    public static final void mandatoryCollection(final String strParamName, final Collection<?> coll)
    {
        if (coll == null || coll.isEmpty())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-empty collection");
        }
    }

    /**
     * Checks that the map parameter contains at least one entry.
     *
     * @param strParamName
     *            Name of parameter to check
     * @param map
     *            map to check
     */
    public static final void mandatoryMap(final String strParamName, final Map<?, ?> map)
    {
        if (map == null || map.isEmpty())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a non-null, non-empty map");
        }
    }

    /**
     * Checks that the value parameter is a native-like script function.
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            value to check
     */
    public static final void mandatoryNativeFunction(final String strParamName, final Object value)
    {
        if (value == null || !(value instanceof JSObject) || !((JSObject) value).isFunction())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a JS-Object based function");
        }
    }

    /**
     * Checks that the value parameter is a native-like script array.
     *
     * @param strParamName
     *            Name of parameter to check
     * @param value
     *            value to check
     *
     * @return the length of the array
     */
    public static final int mandatoryNativeArray(final String strParamName, final Object value)
    {
        if (value == null || !(value instanceof JSObject) || !((JSObject) value).isArray())
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a JS-Object based array (and provide a 'length' property");
        }

        final Object lengthMemberValue = ((JSObject) value).getMember("length");
        if (!(lengthMemberValue instanceof Number))
        {
            throw new IllegalArgumentException("'" + strParamName + "' must be a JS-Object based array (and provide a 'length' property");
        }
        return ((Number) lengthMemberValue).intValue();
    }
}
