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
package de.axelfaust.alfresco.nashorn.repo.junit.interop;

import org.junit.runners.model.Statement;

import de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel;

/**
 * @author Axel Faust
 */
public class NashornScriptModelSatementFacade extends Statement
{

    protected final Statement delegateStatement;

    public NashornScriptModelSatementFacade(final Statement delegateStatement)
    {
        this.delegateStatement = delegateStatement;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void evaluate() throws Throwable
    {
        try (final NashornScriptModel scriptModel = NashornScriptModel.openModel())
        {
            this.delegateStatement.evaluate();
        }
    }

}
