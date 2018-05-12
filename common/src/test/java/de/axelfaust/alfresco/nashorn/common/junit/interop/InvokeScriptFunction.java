/*
 * Copyright 2018 Axel Faust
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
package de.axelfaust.alfresco.nashorn.common.junit.interop;

import org.junit.runners.model.Statement;

/**
 * @author Axel Faust
 */
public class InvokeScriptFunction extends Statement
{

    protected Statement delegateStatement;

    protected boolean statementIsBefore;

    protected final Object testObject;

    protected final ScriptFunction scriptFunction;

    protected final Object[] prefixArgs;

    public InvokeScriptFunction(final Statement delegateStatement, final boolean statementIsBefore, final Object testObject,
            final ScriptFunction scriptFunction, final Object... prefixArgs)
    {
        this.delegateStatement = delegateStatement;
        this.statementIsBefore = statementIsBefore;
        this.testObject = testObject;
        this.scriptFunction = scriptFunction;
        this.prefixArgs = prefixArgs;
    }

    public InvokeScriptFunction(final Object testObject, final ScriptFunction scriptFunction, final Object... prefixArgs)
    {
        this.testObject = testObject;
        this.scriptFunction = scriptFunction;
        this.prefixArgs = prefixArgs;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void evaluate() throws Throwable
    {
        if (this.delegateStatement != null)
        {
            if (!this.statementIsBefore)
            {
                this.scriptFunction.invoke(this.testObject, this.prefixArgs);
                this.delegateStatement.evaluate();
            }
            else
            {
                try
                {
                    this.delegateStatement.evaluate();
                }
                finally
                {
                    this.scriptFunction.invoke(this.testObject, this.prefixArgs);
                }
            }
        }
        else
        {
            this.scriptFunction.invoke(this.testObject, this.prefixArgs);
        }
    }

}
