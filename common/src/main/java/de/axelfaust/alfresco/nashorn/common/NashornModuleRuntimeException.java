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
package de.axelfaust.alfresco.nashorn.common;

import org.slf4j.helpers.MessageFormatter;

/**
 * This base exception class is similar to the default Alfresco {@code org.alfresco.error.AlfrescoRuntimeException}, but uses
 * {@link MessageFormatter} for formatting messages and does not offer I18n support. Exceptions of this type and any sub-type are meant to
 * be technical exceptions not to be exposed to non-technical end users.
 *
 * @author Axel Faust
 */
public class NashornModuleRuntimeException extends RuntimeException
{

    private static final long serialVersionUID = -2837443545116786943L;

    public NashornModuleRuntimeException()
    {
        super();
    }

    public NashornModuleRuntimeException(final String message)
    {
        super(message);
    }

    public NashornModuleRuntimeException(final String message, final Throwable cause)
    {
        super(message, cause);
    }

    public NashornModuleRuntimeException(final String message, final Object... parameters)
    {
        super(MessageFormatter.arrayFormat(message, parameters).getMessage());
    }

    public NashornModuleRuntimeException(final String message, final Object[] parameters, final Throwable cause)
    {
        super(MessageFormatter.arrayFormat(message, parameters).getMessage(), cause);
    }

    public NashornModuleRuntimeException(final String message, final Throwable cause, final Object... parameters)
    {
        super(MessageFormatter.arrayFormat(message, parameters).getMessage(), cause);
    }
}
