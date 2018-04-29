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
package de.axelfaust.alfresco.nashorn.common.amd;

/**
 * @author Axel Faust
 */
public class SecureModuleException extends ModuleSystemRuntimeException
{

    private static final long serialVersionUID = 8994570873945822867L;

    public SecureModuleException()
    {
        super();
    }

    public SecureModuleException(final String message, final Object... parameters)
    {
        super(message, parameters);
    }

    public SecureModuleException(final String message, final Object[] parameters, final Throwable cause)
    {
        super(message, parameters, cause);
    }

    public SecureModuleException(final String message, final Throwable cause, final Object... parameters)
    {
        super(message, cause, parameters);
    }

    public SecureModuleException(final String message, final Throwable cause)
    {
        super(message, cause);
    }

    public SecureModuleException(final String message)
    {
        super(message);
    }

}
