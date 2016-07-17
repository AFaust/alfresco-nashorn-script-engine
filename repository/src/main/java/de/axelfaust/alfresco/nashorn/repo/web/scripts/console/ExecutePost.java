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
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.nio.charset.Charset;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.http.HttpServletResponse;

import org.alfresco.repo.cache.SimpleCache;
import org.alfresco.repo.content.MimetypeMap;
import org.alfresco.repo.security.authentication.AuthenticationUtil;
import org.alfresco.repo.security.authentication.AuthenticationUtil.RunAsWork;
import org.alfresco.repo.transaction.RetryingTransactionHelper.RetryingTransactionCallback;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.datatype.DefaultTypeConverter;
import org.alfresco.service.transaction.TransactionService;
import org.alfresco.util.ISO8601DateFormat;
import org.alfresco.util.Pair;
import org.alfresco.util.PropertyCheck;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.extensions.surf.util.Content;
import org.springframework.extensions.webscripts.AbstractWebScript;
import org.springframework.extensions.webscripts.Cache;
import org.springframework.extensions.webscripts.Status;
import org.springframework.extensions.webscripts.TemplateProcessor;
import org.springframework.extensions.webscripts.WebScriptException;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;

import de.axelfaust.alfresco.nashorn.repo.loaders.CallerProvidedURLConnection;

/**
 * @author Axel Faust
 */
public class ExecutePost extends AbstractWebScript implements InitializingBean
{

    private static final String CALLSTACK_AT_PREFIX = "\tat ";

    private static final Logger LOGGER = LoggerFactory.getLogger(ExecutePost.class);

    protected static final String CONSOLE_EXECUTER_CLASSPATH = "de/axelfaust/alfresco/nashorn/repo/webscripts/console-script-executer.js";

    protected static final String REQ_RESULT_CHANNEL = "resultChannel";

    protected static final String REQ_RUN_AS = "runAs";

    protected static final String REQ_TRANSACTION = "transaction";

    protected static final String REQ_TRANSACTION_READ_ONLY = "readOnly";

    protected static final String REQ_TRANSACTION_NONE = "none";

    protected static final String REQ_SCRIPT = "script";

    protected static final String REQ_TEMPLATE = "template";

    protected static final String REQ_SPACE = "space";

    protected static final String REQ_DOCUMENT = "document";

    protected static final String REQ_URL_QUERY_STRING = "urlQueryString";

    protected TransactionService transactionService;

    protected SimpleCache<Pair<String, Integer>, List<String>> printOutputCache;

    protected int printOutputChunkSize = 5;

    protected SimpleCache<String, String> resultCache;

    /**
     * {@inheritDoc}
     */
    @Override
    public void afterPropertiesSet()
    {
        PropertyCheck.mandatory(this, "transactionService", this.transactionService);
    }

    /**
     * @param transactionService
     *            the transactionService to set
     */
    public void setTransactionService(final TransactionService transactionService)
    {
        this.transactionService = transactionService;
    }

    /**
     * @param printOutputCache
     *            the printOutputCache to set
     */
    public void setPrintOutputCache(final SimpleCache<Pair<String, Integer>, List<String>> printOutputCache)
    {
        this.printOutputCache = printOutputCache;
    }

    /**
     * @param printOutputChunkSize
     *            the printOutputChunkSize to set
     */
    public void setPrintOutputChunkSize(final int printOutputChunkSize)
    {
        this.printOutputChunkSize = printOutputChunkSize;
    }

    /**
     * @param resultCache
     *            the resultCache to set
     */
    public void setResultCache(final SimpleCache<String, String> resultCache)
    {
        this.resultCache = resultCache;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void execute(final WebScriptRequest req, final WebScriptResponse res) throws IOException
    {
        Map<String, Object> requestModel = null;
        final Map<String, Object> resultModel = new HashMap<String, Object>();
        final long webScriptStart = System.nanoTime();
        try
        {
            requestModel = this.processRequestData(req);

            final String runAs = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_RUN_AS));
            final String transaction = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_TRANSACTION));

            final boolean readOnlyTxn = REQ_TRANSACTION_READ_ONLY.equals(transaction);
            final boolean noTxn = REQ_TRANSACTION_NONE.equals(transaction);

            final Map<String, Object> rqModel = requestModel;

            this.executeImpl(req, res, runAs, readOnlyTxn, noTxn, rqModel, resultModel);
        }
        catch (final RuntimeException e)
        {
            LOGGER.debug("Execution failed", e);

            res.setStatus(e instanceof WebScriptException ? ((WebScriptException) e).getStatus() : Status.STATUS_INTERNAL_SERVER_ERROR);

            final Cache cache = new Cache(this.getDescription().getRequiredCache());
            res.setCache(cache);

            final Status status = new Status();
            status.setCode(e instanceof WebScriptException ? ((WebScriptException) e).getStatus() : Status.STATUS_INTERNAL_SERVER_ERROR,
                    e.getMessage());
            status.setException(e);
            this.addStatusToResultModel(resultModel, status);
        }
        finally
        {
            resultModel.put("webScriptMicroTime", Math.round((Long.valueOf(System.nanoTime() - webScriptStart)/1000)));
            this.writeResultData(res, requestModel, resultModel);
        }
    }

    protected void executeImpl(final WebScriptRequest req, final WebScriptResponse res, final String runAs, final boolean readOnlyTxn,
            final boolean noTxn, final Map<String, Object> requestModel, final Map<String, Object> resultModel)
    {
        if (runAs != null && !runAs.trim().isEmpty())
        {
            LOGGER.debug("Executing script as {}", runAs);
            AuthenticationUtil.runAs(new RunAsWork<Void>()
            {

                /**
                 *
                 * {@inheritDoc}
                 */
                @Override
                public Void doWork() throws Exception
                {
                    ExecutePost.this.executeImpl(req, res, readOnlyTxn, noTxn, requestModel, resultModel);
                    return null;
                }

            }, runAs);
        }
        else
        {
            LOGGER.debug("Executing script as fully authenticated user");
            this.executeImpl(req, res, readOnlyTxn, noTxn, requestModel, resultModel);
        }
    }

    protected void executeImpl(final WebScriptRequest req, final WebScriptResponse res, final boolean readOnlyTxn, final boolean noTxn,
            final Map<String, Object> requestModel, final Map<String, Object> resultModel)
    {
        final List<String> printOutput;

        final String resultChannel = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_RESULT_CHANNEL));
        if (this.printOutputCache != null && resultChannel != null && !resultChannel.trim().isEmpty())
        {
            printOutput = new CacheBackedChunkedList<String, String>(this.printOutputCache, resultChannel, this.printOutputChunkSize);
        }
        else
        {
            printOutput = new ArrayList<String>();
        }
        resultModel.put("printOutput", printOutput);

        try
        {
            if (noTxn)
            {
                LOGGER.debug("Executing script without transaction");
                ExecutePost.this.executeImpl(req, res, requestModel, resultModel);
            }
            else
            {
                LOGGER.debug("Executing script as read-only={}", readOnlyTxn);
                ExecutePost.this.transactionService.getRetryingTransactionHelper().doInTransaction(new RetryingTransactionCallback<Void>()
                {

                    /**
                     *
                     * {@inheritDoc}
                     */
                    @Override
                    public Void execute() throws Throwable
                    {
                        // clear due to potential retry
                        printOutput.clear();

                        ExecutePost.this.executeImpl(req, res, requestModel, resultModel);
                        return null;
                    }
                }, readOnlyTxn);
            }
        }
        finally
        {
            if (printOutput instanceof CacheBackedChunkedList<?, ?>)
            {
                ((CacheBackedChunkedList<?, ?>) printOutput).commitToCache();
            }
        }
    }

    protected void executeImpl(final WebScriptRequest req, final WebScriptResponse res, final Map<String, Object> requestModel,
            final Map<String, Object> resultModel)
    {
        final Map<String, Object> model = new HashMap<String, Object>(8, 1.0f);

        // construct model for script / template
        final Status status = new Status();
        final Cache cache = new Cache(this.getDescription().getRequiredCache());
        model.put("status", status);
        model.put("cache", cache);

        final Map<String, Object> scriptResultModel = this.executeScriptImpl(req, res, requestModel, resultModel);
        model.putAll(scriptResultModel);

        if (status.getRedirect())
        {
            res.reset();
            res.setCache(cache);
            res.setStatus(req.forceSuccessStatus() ? HttpServletResponse.SC_OK : status.getCode());

            this.addStatusToResultModel(resultModel, status);
        }
        else
        {
            // apply location
            final String location = status.getLocation();
            if (location != null && !location.trim().isEmpty())
            {
                LOGGER.debug("Setting location to {}", location);
                res.setHeader(WebScriptResponse.HEADER_LOCATION, location);
            }

            this.executeTemplateImpl(req, res, requestModel, resultModel, model);
        }
    }

    protected Map<String, Object> executeScriptImpl(final WebScriptRequest req, final WebScriptResponse res,
            final Map<String, Object> requestModel, final Map<String, Object> resultModel)
    {
        final Map<String, Object> returnModel = new HashMap<String, Object>();
        final String script = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_SCRIPT));
        if (script != null && !script.trim().isEmpty())
        {
            final Map<String, Object> scriptModel = this.createScriptParameters(req, res, requestModel);

            scriptModel.put("model", returnModel);
            scriptModel.put("_printOutput", resultModel.get("printOutput"));

            final long scriptStart = System.nanoTime();
            CallerProvidedURLConnection.registerCallerProvidedScript(script, true);
            try
            {
                final ScriptDetails executeScript = this.getExecuteScript(req.getContentType());
                this.executeScript(executeScript.getContent(), scriptModel);
            }
            finally
            {
                CallerProvidedURLConnection.clearCallerProvidedScript();
                resultModel.put("scriptMicroTime", Math.round((Long.valueOf(System.nanoTime() - scriptStart)/1000)));
            }
        }

        return returnModel;
    }

    protected void executeTemplateImpl(final WebScriptRequest req, final WebScriptResponse res, final Map<String, Object> requestModel,
            final Map<String, Object> resultModel, final Map<String, Object> templateModel)
    {
        final String template = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_TEMPLATE));
        if (template != null && !template.trim().isEmpty())
        {
            final TemplateProcessor templateProcessor = this.getContainer().getTemplateProcessorRegistry()
                    .getTemplateProcessorByExtension("ftl");
            final StringWriter sw = new StringWriter();
            final long templateStart = System.nanoTime();
            try
            {
                templateProcessor.processString(template, templateModel, sw);
                final String templateResult = sw.toString();
                resultModel.put("renderedTemplate", templateResult);
            }
            finally
            {
                resultModel.put("templateMicroTime", Math.round((Long.valueOf(System.nanoTime() - templateStart) / 1000)));
            }

        }
    }

    protected Map<String, Object> createScriptParameters(final WebScriptRequest req, final WebScriptResponse res,
            final Map<String, Object> requestModel)
    {
        final Map<String, Object> scriptParameters = new HashMap<String, Object>();

        // we call the standard "createScriptParameters" only for some of the "less accessible" parts, e.g. scriptConfigModel
        final Map<String, Object> defaultScriptParameters = this.createScriptParameters(req, res, null, null);

        // TODO can we provide a "webscript" and "format" object based on parameters in requestModel?

        this.prepareArgumentsForScriptParameters(requestModel, scriptParameters);
        this.prepareHeadersForScriptParameters(requestModel, scriptParameters);

        // guest is determined from arguments by AbstractWebScript (regardless of current user name)
        @SuppressWarnings("unchecked")
        final Map<String, String> args = (Map<String, String>) scriptParameters.get("args");
        scriptParameters.put("guest", Boolean.valueOf(args.get("guest")));

        // TODO provide an URLModel based on parameters in requestModel
        // TODO add a message method and register dynamic bundle from potential param in requestModel
        // TODO parse and provide params from request body provided as param in requestModel

        // add context & runtime parameters
        scriptParameters.putAll(req.getRuntime().getScriptParameters());
        scriptParameters.putAll(this.getContainer().getScriptParameters());

        // we can't access the scriptConfigModel ourselves and don't want to copy all the code necessary to create it
        scriptParameters.put("config", defaultScriptParameters.get("config"));

        final String space = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_SPACE));
        if (space != null && NodeRef.isNodeRef(space))
        {
            scriptParameters.put("space", new NodeRef(space));
        }

        final String document = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_DOCUMENT));
        if (document != null && NodeRef.isNodeRef(document))
        {
            scriptParameters.put("document", new NodeRef(document));
        }

        return scriptParameters;
    }

    protected void prepareArgumentsForScriptParameters(final Map<String, Object> requestModel, final Map<String, Object> scriptParameters)
    {
        final String urlQueryString = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_URL_QUERY_STRING));
        if (urlQueryString != null && !urlQueryString.trim().isEmpty())
        {
            @SuppressWarnings("unchecked")
            final Map<String, String[]> argsM = (Map<String, String[]>) parseQueryString(urlQueryString);
            final Map<String, String> args = new HashMap<String, String>();
            for (final Entry<String, String[]> argsMEntry : argsM.entrySet())
            {
                args.put(argsMEntry.getKey(), argsMEntry.getValue()[0]);
            }

            scriptParameters.put("argsM", argsM);
            scriptParameters.put("args", args);
        }
        else
        {
            scriptParameters.put("argsM", new HashMap<String, String[]>());
            scriptParameters.put("args", new HashMap<String, String>());
        }
    }

    protected void prepareHeadersForScriptParameters(final Map<String, Object> requestModel, final Map<String, Object> scriptParameters)
    {
        // TODO Prepare headers from parameters in requestModel
        scriptParameters.put("headersM", new HashMap<String, String[]>());
        scriptParameters.put("headers", new HashMap<String, String>());
    }

    protected void addStatusToResultModel(final Map<String, Object> resultModel, final Status status)
    {
        final Map<String, Object> statusMap = new HashMap<String, Object>();
        statusMap.put("code", status.getCode());
        statusMap.put("name", status.getCodeName());
        statusMap.put("description", status.getCodeDescription());
        resultModel.put("status", statusMap);
        resultModel.put("message", status.getMessage());

        final Throwable exception = status.getException();
        if (exception != null)
        {
            final String message = exception.getMessage();
            if (message != null && !message.trim().isEmpty())
            {
                resultModel.put("exception", MessageFormat.format("{0} - {1}", exception.getClass().getName(), message));
            }
            else
            {
                resultModel.put("exception", exception.getClass().getName());
            }

            final List<String> callstackLines = new ArrayList<String>();
            this.collectCallstackLines(exception, callstackLines);
            resultModel.put("callstack", callstackLines);
        }
        else
        {
            resultModel.put("exception", "");
            resultModel.put("callstack", Collections.<String> emptyList());
        }

        // we don't really need the server and date information normally found in json.status.ftl
    }

    protected void collectCallstackLines(final Throwable exception, final List<String> callstackLines)
    {
        if (exception.getCause() != null)
        {
            this.collectCallstackLines(exception.getCause(), callstackLines);

            callstackLines.add("Wrapped in " + exception.toString());
            callstackLines.add(CALLSTACK_AT_PREFIX + exception.getStackTrace()[0].toString());
        }
        else
        {
            callstackLines.add(exception.toString());
            for (final StackTraceElement element : exception.getStackTrace())
            {
                callstackLines.add(CALLSTACK_AT_PREFIX + element.toString());
            }
        }
    }

    protected void writeResultData(final WebScriptResponse res, final Map<String, Object> requestModel,
            final Map<String, Object> resultModel)
    {
        try
        {
            final Object json = this.toJSON(resultModel);
            final String resultJSON = json.toString();

            final String resultChannel = DefaultTypeConverter.INSTANCE.convert(String.class, requestModel.get(REQ_RESULT_CHANNEL));
            if (this.resultCache != null && resultChannel != null && !resultChannel.trim().isEmpty())
            {
                this.resultCache.put(resultChannel, resultJSON);
            }

            res.setContentEncoding("UTF-8");
            res.setContentType(MimetypeMap.MIMETYPE_JSON);
            res.getWriter().write(resultJSON);
        }
        catch (final IOException | JSONException rese)
        {
            throw new WebScriptException(Status.STATUS_INTERNAL_SERVER_ERROR, "Error writing response data", rese);
        }
    }

    protected Object toJSON(final Map<?, ?> model) throws JSONException
    {
        final JSONObject json = new JSONObject();
        for (final Entry<?, ?> entry : model.entrySet())
        {
            Object value = entry.getValue();
            if (value instanceof Map<?, ?>)
            {
                value = this.toJSON((Map<?, ?>) value);
            }
            else if (value instanceof List<?>)
            {
                value = this.toJSON((List<?>) value);
            }
            else if (value instanceof Date)
            {
                value = ISO8601DateFormat.format((Date) value);
            }
            else if (value != null && !(value instanceof String || value instanceof Number))
            {
                value = String.valueOf(value);
            }

            json.put(String.valueOf(entry.getKey()), value);
        }

        return json;
    }

    protected Object toJSON(final List<?> model) throws JSONException
    {
        final JSONArray json = new JSONArray();
        int idx = 0;
        for (Object element : model)
        {
            if (element instanceof Map<?, ?>)
            {
                element = this.toJSON((Map<?, ?>) element);
            }
            else if (element instanceof List<?>)
            {
                element = this.toJSON((List<?>) element);
            }
            else if (element instanceof Date)
            {
                element = ISO8601DateFormat.format((Date) element);
            }
            else if (element != null && !(element instanceof String || element instanceof Number))
            {
                element = String.valueOf(element);
            }

            json.put(idx++, element);
        }
        return json;
    }

    protected Map<String, Object> processRequestData(final WebScriptRequest req)
    {
        final Content content = req.getContent();

        try (final InputStreamReader br = new InputStreamReader(content.getInputStream(), Charset.forName("UTF-8")))
        {
            final JSONTokener jsonTokener = new JSONTokener(br);
            final JSONObject jsonInput = new JSONObject(jsonTokener);

            final Map<String, Object> requestData = this.processRequestData(jsonInput);
            return requestData;
        }
        catch (final IOException ioe)
        {
            throw new WebScriptException(Status.STATUS_INTERNAL_SERVER_ERROR, "Error handling request data", ioe);
        }
        catch (final JSONException jsone)
        {
            throw new WebScriptException(Status.STATUS_BAD_REQUEST, "Error reading request data", jsone);
        }
    }

    protected Map<String, Object> processRequestData(final JSONObject data) throws JSONException
    {
        final Map<String, Object> result = new HashMap<String, Object>();

        for (final String key : JSONObject.getNames(data))
        {
            Object object = data.get(key);
            if (object instanceof JSONObject)
            {
                object = this.processRequestData((JSONObject) object);
            }
            else if (object instanceof JSONArray)
            {
                object = this.processRequestData((JSONArray) object);
            }
            result.put(key, object);
        }

        return result;
    }

    protected List<Object> processRequestData(final JSONArray data) throws JSONException
    {
        final List<Object> result = new ArrayList<Object>();
        for (int idx = 0; idx < data.length(); idx++)
        {
            Object element = data.get(idx);

            if (element instanceof JSONObject)
            {
                element = this.processRequestData((JSONObject) element);
            }
            else if (element instanceof JSONArray)
            {
                element = this.processRequestData((JSONArray) element);
            }

            result.add(element);
        }

        return result;
    }

    protected static Map<String, ?> parseQueryString(final String queryString)
    {
        final Map<String, Object> argsM = new HashMap<String, Object>();

        if (queryString != null)
        {
            final String[] parameters = queryString.split("&");
            for (int i = 0; i < parameters.length; i++)
            {
                final String[] keyAndValue = parameters[i].split("=");
                if (keyAndValue.length != 2)
                {
                    // "invalid url parameter " + parameters[i]);
                    continue;
                }
                final String key = keyAndValue[0];
                final String value = keyAndValue[1];

                List<String> values;
                if (argsM.containsKey(key))
                {
                    values = (List<String>) argsM.get(key);
                }
                else
                {
                    values = new ArrayList<String>();
                    argsM.put(key, values);
                }
                values.add(value);
            }
        }

        // convert to proper argsM model
        for (final Entry<String, Object> argsMEntry : argsM.entrySet())
        {
            argsMEntry.setValue(((List<?>) argsMEntry.getValue()).toArray(new String[0]));
        }

        return argsM;
    }
}
