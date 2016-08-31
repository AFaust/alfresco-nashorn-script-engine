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
package de.axelfaust.alfresco.nashorn.repo.web.scripts.console;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.alfresco.repo.cache.SimpleCache;
import org.alfresco.repo.content.MimetypeMap;
import org.alfresco.util.Pair;
import org.alfresco.util.PropertyCheck;
import org.json.JSONException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.extensions.webscripts.AbstractWebScript;
import org.springframework.extensions.webscripts.Cache;
import org.springframework.extensions.webscripts.Status;
import org.springframework.extensions.webscripts.WebScriptException;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;

/**
 * Web script to retrieve the result of a web script execution or - in case the web script has not run to completion yet - the intermediary
 * log output.
 *
 * @author Axel Faust
 */
public class ResultGet extends AbstractWebScript implements InitializingBean
{

    protected SimpleCache<Pair<String, Integer>, List<String>> printOutputCache;

    protected SimpleCache<String, String> resultCache;

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "printOutputCache", this.printOutputCache);
        PropertyCheck.mandatory(this, "resultCache", this.resultCache);
    }

    /**
     * @param printOutputCache
     *            the printOutputCache to set
     */
    public final void setPrintOutputCache(final SimpleCache<Pair<String, Integer>, List<String>> printOutputCache)
    {
        this.printOutputCache = printOutputCache;
    }

    /**
     * @param resultCache
     *            the resultCache to set
     */
    public final void setResultCache(final SimpleCache<String, String> resultCache)
    {
        this.resultCache = resultCache;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    public void execute(final WebScriptRequest request, final WebScriptResponse response) throws IOException
    {
        final String resultChannel = request.getServiceMatch().getTemplateVars().get("resultChannel");

        if (resultChannel != null && resultChannel.trim().length() > 0)
        {
            final Cache cache = new Cache();
            cache.setNeverCache(true);
            response.setCache(cache);

            response.setContentEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MimetypeMap.MIMETYPE_JSON);

            final String result = this.resultCache.get(resultChannel);
            if (result != null)
            {
                // script execution is complete, result will already contain all the printOutput
                response.getWriter().write(result);
            }
            else
            {
                final List<String> printOutput = new ArrayList<String>();
                for (int chunk = 0; chunk < Integer.MAX_VALUE; chunk++)
                {
                    final Pair<String, Integer> chunkKey = new Pair<String, Integer>(resultChannel, Integer.valueOf(chunk));
                    final List<String> chunkOutput = this.printOutputCache.get(chunkKey);
                    if (chunkOutput != null)
                    {
                        printOutput.addAll(chunkOutput);
                    }
                    else
                    {
                        break;
                    }
                }

                final Map<String, Object> resultModel = new HashMap<String, Object>();
                resultModel.put("printOutput", printOutput);

                try
                {
                    final Object jsonObj = ExecutePost.toJSON(resultModel);
                    final String json = jsonObj.toString();
                    response.getWriter().write(json);
                }
                catch (final JSONException e)
                {
                    throw new WebScriptException(Status.STATUS_INTERNAL_SERVER_ERROR, "Error writing json response.", e);
                }
            }
        }
        else
        {
            throw new WebScriptException(Status.STATUS_BAD_REQUEST, "The print output channel has not been specified");
        }
    }
}
