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
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.io.InputStream;

import org.alfresco.repo.transaction.RetryingTransactionHelper;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.util.ParameterCheck;
import org.springframework.extensions.webscripts.ScriptContent;

/**
 * @author Axel Faust
 */
public class NodeScriptContentFile extends AbstractNodeScriptFile
{

    protected final ScriptContent scriptContent;

    public NodeScriptContentFile(final NodeRef nodeRef, final ScriptContent scriptContent, final NodeService nodeService,
            final RetryingTransactionHelper retryingTransactionHelper)
    {
        super(nodeRef, nodeService, retryingTransactionHelper);
        ParameterCheck.mandatory("scriptContent", scriptContent);

        this.scriptContent = scriptContent;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected InputStream getInputStreamInternal()
    {
        return this.scriptContent.getInputStream();
    }

}
