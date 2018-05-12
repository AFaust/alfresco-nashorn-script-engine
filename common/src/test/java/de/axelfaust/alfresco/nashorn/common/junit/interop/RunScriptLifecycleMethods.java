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

import java.util.List;

import org.junit.runners.model.FrameworkMethod;
import org.junit.runners.model.Statement;

/**
 * @author Axel Faust
 */
public class RunScriptLifecycleMethods extends Statement
{

    protected final Statement delegateStatement;

    protected final boolean statementIsBefore;

    protected final Object target;

    protected final List<FrameworkMethod> methods;

    protected final Object[] args;

    public RunScriptLifecycleMethods(final Statement delegateStatement, final boolean statementIsBefore,
            final List<FrameworkMethod> methods, final Object target, final Object... args)
    {
        this.delegateStatement = delegateStatement;
        this.statementIsBefore = statementIsBefore;
        this.methods = methods;
        this.target = target;
        this.args = args;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void evaluate() throws Throwable
    {
        if (!this.statementIsBefore)
        {
            for (final FrameworkMethod method : this.methods)
            {
                method.invokeExplosively(this.target, this.args);
            }
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
                for (final FrameworkMethod method : this.methods)
                {
                    method.invokeExplosively(this.target, this.args);
                }
            }
        }
    }
}
