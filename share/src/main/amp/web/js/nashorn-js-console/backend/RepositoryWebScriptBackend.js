/**
 * This module provides a JavaScript Console backend for the Repository-tier web script runtime.
 * 
 * @module jsconsole-nashorn/backend/RepositoryWebScriptBackend
 * @extends module:alfresco/services/BaseService
 * @mixes module:alfresco/core/CoreXhr
 * @mixes module:jsconsole/_ConsoleTopicsMixin
 * @author Axel Faust
 */
define(
        [ 'dojo/_base/declare', 'alfresco/services/BaseService', 'alfresco/core/CoreXhr', 'jsconsole/_ConsoleTopicsMixin',
                'dojo/_base/lang', 'dojo/_base/array', 'service/constants/Default', 'alfresco/util/functionUtils' ],
        function(declare, BaseService, CoreXhr, _ConsoleTopicsMixin, lang, array, Constants, functionUtils)
        {
            return declare(
                    [ BaseService, CoreXhr, _ConsoleTopicsMixin ],
                    {

                        cssRequirements : [ {
                            cssFile : './css/RepositoryWebScriptBackend.css'
                        } ],

                        i18nRequirements : [ {
                            i18nFile : 'jsconsole/backend/i18n/CommonBackend.properties'
                        }, {
                            i18nFile : './i18n/RepositoryWebScriptBackend.properties'
                        } ],

                        widgetsForExecutionParameterForm : [ {
                            id : 'NASHORN_REPOSITORY_WEBSCRIPT_BACKEND-URL_ARGUMENTS',
                            name : 'alfresco/forms/controls/TextBox',
                            config : {
                                additionalCssClasses : 'fixedWidth parameters-urlArguments',
                                name : 'executionParameter.urlArguments',
                                label : 'jsconsole.backend.webscript.parameters.urlArguments.label',
                                description : 'jsconsole.backend.webscript.parameters.urlArguments.description',
                                value : ''
                            }
                        }, {
                            id : 'NASHORN_REPOSITORY_WEBSCRIPT_BACKEND-RUN_AS',
                            name : 'alfresco/forms/controls/TextBox',
                            config : {
                                additionalCssClasses : 'fixedWidth parameters-runAs',
                                name : 'executionParameter.runAs',
                                label : 'jsconsole.backend.parameters.runAs.label',
                                description : 'jsconsole.backend.parameters.runAs.description',
                                value : 'admin'
                            }
                        }, {
                            id : 'NASHORN_REPOSITORY_WEBSCRIPT_BACKEND-ISOLATION',
                            name : 'alfresco/forms/controls/Select',
                            config : {
                                additionalCssClasses : 'fixedWidth parameters-isolation',
                                name : 'executionParameter.isolation',
                                label : 'jsconsole.backend.repository.parameters.isolation.label',
                                description : 'jsconsole.backend.repository.parameters.isolation.description',
                                optionsConfig : {
                                    fixed : [ {
                                        label : 'jsconsole.backend.repository.parameters.isolation.none.label',
                                        value : 'none'
                                    }, {
                                        label : 'jsconsole.backend.repository.parameters.isolation.readOnly.label',
                                        value : 'readonly'
                                    }, {
                                        label : 'jsconsole.backend.repository.parameters.isolation.readWrite.label',
                                        value : 'readwrite'
                                    } ]
                                },
                                value : 'readwrite'
                            }
                        }, {
                            id : 'NASHORN_REPOSITORY_WEBSCRIPT_BACKEND-RUN_LIKE_CRAZY',
                            name : 'alfresco/forms/controls/Select',
                            config : {
                                additionalCssClasses : 'fixedWidth parameters-runLikeCrazy',
                                name : 'executionParameter.runLikeCrazy',
                                label : 'jsconsole.backend.parameters.runLikeCrazy.label',
                                description : 'jsconsole.backend.parameters.runLikeCrazy.description',
                                optionsConfig : {
                                    fixed : [ {
                                        label : 'jsconsole.backend.parameters.runLikeCrazy.off.label',
                                        value : '-1'
                                    }, {
                                        label : 'jsconsole.backend.parameters.runLikeCrazy.tenS.label',
                                        value : '10000'
                                    }, {
                                        label : 'jsconsole.backend.parameters.runLikeCrazy.oneS.label',
                                        value : '1000'
                                    }, {
                                        label : 'jsconsole.backend.parameters.runLikeCrazy.zero.label',
                                        value : '0'
                                    } ]
                                },
                                value : '-1'
                            }
                        } ],

                        initService : function nashornjsconsole_backend_RepositoryWebScriptBackend__initService()
                        {
                            this.inherited(arguments);

                            // generated ID to allow easy differentiation of backend services
                            this.backendId = this.generateUuid();

                            // need to track requests by alfResponseScope
                            this._activeRequestByScope = {};
                        },

                        registerSubscriptions : function nashornjsconsole_backend_RepositoryWebScriptBackend__registerSubscriptions()
                        {
                            this.inherited(arguments);

                            this.alfSubscribe(this.discoverBackendsTopic, lang.hitch(this, this.onDiscoverBackendsRequest));
                            this.alfSubscribe(this.executeInBackendTopic, lang.hitch(this, this.onExecuteInBackendRequest));
                        },

                        onDiscoverBackendsRequest : function nashornjsconsole_backend_RepositoryWebScriptBackend__onDiscoverBackendsRequest(
                                payload)
                        {
                            // just respond to announce backend to requesting module
                            this.alfPublish((payload.alfResponseTopic || this.discoverBackendsTopic) + '_SUCCESS', {
                                backend : this.backendId,
                                name : 'nashornRepositoryWebScript',
                                label : 'jsconsole.nashorn.backend.RepositoryWebScriptBackend.label',
                                description : 'jsconsole.nashorn.backend.RepositoryWebScriptBackend.description',
                                supports : [ 'javascriptSource', 'freemarkerSource', 'consoleOutput', 'templateOutput' ],
                                executionParameterFormWidgets : lang.clone(this.widgetsForExecutionParameterForm)
                            }, false, false, payload.alfResponseScope || '');
                        },

                        onExecuteInBackendRequest : function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendRequest(
                                payload)
                        {
                            var rqData, consoleRequest;
                            if (payload !== undefined && payload !== null)
                            {
                                if (payload.backend === this.backendId)
                                {
                                    rqData = {
                                        script : payload.selectedJavaScriptSource || payload.javaScriptSource || '',
                                        template : payload.freemarkerSource,
                                        resultChannel : this.generateUuid(),
                                        transaction : lang.getObject('executionParameter.isolation', false, payload) || 'readwrite',
                                        runas : lang.getObject('executionParameter.runAs', false, payload) || Constants.USERNAME,
                                        urlargs : lang.getObject('executionParameter.urlArguments', false, payload) || ''
                                    };

                                    consoleRequest = {
                                        data : rqData,
                                        alfResponseScope : payload.alfResponseScope,
                                        startTime : new Date(),
                                        runLikeCrazy : parseInt(lang.getObject('executionParameter.runLikeCrazy', false, payload) || '-1',
                                                10)
                                    };

                                    this.serviceXhr({
                                        url : Constants.PROXY_URI + 'nashorn-script-engine/execute',
                                        data : rqData,
                                        method : 'POST',
                                        successCallback : lang.hitch(this, this.onExecuteInBackendSuccess, consoleRequest),
                                        failureCallback : lang.hitch(this, this.onExecuteInBackendFailure, consoleRequest)
                                    });

                                    consoleRequest.checkTimer = functionUtils.addRepeatingFunction(lang.hitch(this,
                                            this.onExecuteInBackendCheckProgress, consoleRequest), 'MEDIUM');
                                    this._activeRequestByScope[consoleRequest.alfResponseScope] = consoleRequest;
                                }
                                else if (this._activeRequestByScope.hasOwnProperty(payload.alfResponseScope))
                                {
                                    consoleRequest = this._activeRequestByScope[payload.alfResponseScope];
                                    consoleRequest.superseded = true;
                                    consoleRequest.checkTimer.remove();
                                    delete this._activeRequestByScope[consoleRequest.alfResponseScope];
                                }
                            }
                        },

                        onExecuteInBackendSuccess : function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendSuccess(
                                consoleRequest, response)
                        {
                            this.alfLog('info', 'Request succeeded', response, consoleRequest);
                            if (consoleRequest.superseded !== true && consoleRequest.completed !== true)
                            {
                                try
                                {
                                    this.alfPublish(this.resetConsoleOutputTopic, {}, false, false, consoleRequest.alfResponseScope || '');

                                    if (typeof response === 'string')
                                    {
                                        this.alfPublish(this.appendConsoleOutputTopic, {
                                            content : response
                                        }, false, false, consoleRequest.alfResponseScope || '');

                                        this.alfPublish(this.updateTemplateOutputTopic, {
                                            content : ''
                                        }, false, false, consoleRequest.alfResponseScope || '');
                                    }
                                    else
                                    {
                                        if (lang.isArray(response.printOutput))
                                        {
                                            array
                                                    .forEach(
                                                            response.printOutput,
                                                            function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendSuccess_handlePrintOutputLines(
                                                                    line)
                                                            {
                                                                this.alfPublish(this.appendConsoleOutputTopic, {
                                                                    content : line
                                                                }, false, false, consoleRequest.alfResponseScope || '');
                                                            }, this);
                                        }

                                        this.alfPublish(this.updateTemplateOutputTopic, {
                                            content : response.renderedTemplate || ''
                                        }, false, false, consoleRequest.alfResponseScope || '');
                                    }

                                    // this triggers a best-effort last check (in case an error occurred after response was committed to
                                    // stream)
                                    this.onExecuteInBackendCheckProgress(consoleRequest);

                                    // TODO Handle execution stats
                                    this._runRequestLikeCrazy(consoleRequest);
                                    consoleRequest.completed = true;
                                    consoleRequest.checkTimer.remove();
                                }
                                catch (e)
                                {
                                    this.alfLog('error', 'Encountered error during response handling', response, consoleRequest, e);
                                    this._runRequestLikeCrazy(consoleRequest);
                                    consoleRequest.completed = true;
                                    consoleRequest.checkTimer.remove();
                                }
                            }
                        },

                        onExecuteInBackendFailure : function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendFailure(
                                consoleRequest, response)
                        {
                            this.alfLog('error', 'Request failed', response, consoleRequest);
                            if (consoleRequest.superseded !== true && consoleRequest.completed !== true)
                            {
                                if (response.response && response.response.status !== 408 && response.response.data)
                                {
                                    try
                                    {
                                        response = JSON.parse(response.response.data);
                                    }
                                    catch (e)
                                    {
                                        this.alfLog('warn', 'Error parsing error response', response, consoleRequest, e);
                                    }
                                }

                                if ((response.response && response.response.status !== 408)
                                        || (response.status !== undefined && response.status !== 408))
                                {
                                    this.alfPublish(this.resetConsoleOutputTopic, {}, false, false, consoleRequest.alfResponseScope || '');

                                    if (typeof response === 'string')
                                    {
                                        this.alfPublish(this.appendConsoleOutputTopic, {
                                            content : response
                                        }, false, false, consoleRequest.alfResponseScope || '');
                                    }
                                    else
                                    {
                                        if (lang.isArray(response.printOutput))
                                        {
                                            array
                                                    .forEach(
                                                            response.printOutput,
                                                            function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendCheckProgressSuccess_handlePrintOutputLines(
                                                                    line)
                                                            {
                                                                this.alfPublish(this.appendConsoleOutputTopic, {
                                                                    content : line
                                                                }, false, false, consoleRequest.alfResponseScope || '');
                                                            }, this);
                                        }

                                        if (response.status)
                                        {
                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                content : response.status.code + ' ' + response.status.name
                                            }, false, false, consoleRequest.alfResponseScope || '');

                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                content : response.status.description
                                            }, false, false, consoleRequest.alfResponseScope || '');
                                        }

                                        if (lang.isString(response.message))
                                        {
                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                content : response.message
                                            }, false, false, consoleRequest.alfResponseScope || '');
                                        }

                                        if (lang.isString(response.callstack))
                                        {
                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                content : '\nStacktrace-Details:'
                                            }, false, false, consoleRequest.alfResponseScope || '');

                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                content : response.callstack
                                            }, false, false, consoleRequest.alfResponseScope || '');
                                        }

                                        // TODO Handle potential error marks from execution error
                                    }

                                    // TODO Handle execution stats
                                    this._runRequestLikeCrazy(consoleRequest);
                                    consoleRequest.completed = true;
                                    consoleRequest.checkTimer.remove();
                                }
                            }
                        },

                        onExecuteInBackendCheckProgress : function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendCheckProgress(
                                consoleRequest)
                        {
                            // TODO Check not yet supported in backend
                        },

                        onExecuteInBackendCheckProgressSuccess : function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendCheckProgressSuccess(
                                consoleRequest, response)
                        {
                            this.alfLog('info', 'Progress check succeeded', response, consoleRequest);
                            if (consoleRequest.superseded !== true)
                            {
                                this.alfPublish(this.resetConsoleOutputTopic, {}, false, false, consoleRequest.alfResponseScope || '');

                                if (typeof response === 'string')
                                {
                                    this.alfPublish(this.appendConsoleOutputTopic, {
                                        content : response
                                    }, false, false, consoleRequest.alfResponseScope || '');

                                    this.alfPublish(this.updateTemplateOutputTopic, {
                                        content : ''
                                    }, false, false, consoleRequest.alfResponseScope || '');
                                }
                                else
                                {
                                    if (lang.isArray(response.printOutput))
                                    {
                                        array
                                                .forEach(
                                                        response.printOutput,
                                                        function nashornjsconsole_backend_RepositoryWebScriptBackend__onExecuteInBackendCheckProgressSuccess_handlePrintOutputLines(
                                                                line)
                                                        {
                                                            this.alfPublish(this.appendConsoleOutputTopic, {
                                                                content : line
                                                            }, false, false, consoleRequest.alfResponseScope || '');
                                                        }, this);
                                    }

                                    // if we had an error or entire web script is already done this will be the last update
                                    if (response.error === true || response.error === 'true' || lang.isString(response.webscriptPerf))
                                    {
                                        this.alfPublish(this.updateTemplateOutputTopic, {
                                            content : response.renderedTemplate || ''
                                        }, false, false, consoleRequest.alfResponseScope || '');

                                        if (response.error === true || response.error === 'true')
                                        {
                                            // TODO Handle potential error marks from execution error
                                        }

                                        // TODO Handle execution stats
                                        this._runRequestLikeCrazy(consoleRequest);
                                        consoleRequest.completed = true;
                                        consoleRequest.checkTimer.remove();
                                    }
                                }
                            }
                        },

                        _runRequestLikeCrazy : function nashornjsconsole_backend_RepositoryWebScriptBackend__runRequestLikeCrazy(
                                consoleRequest)
                        {
                            if (consoleRequest.runLikeCrazy >= 0)
                            {
                                setTimeout(lang.hitch(this,
                                        function nashornjsconsole_backend_RepositoryWebScriptBackend__runRequestLikeCrazy_trigger(
                                                oldConsoleRequest)
                                        {
                                            var repeatConsoleRequest = lang.clone(oldConsoleRequest);
                                            lang.setObject('rqData.resultChannel', this.generateUuid(), repeatConsoleRequest);
                                            lang.setObject('startTime', new Date(), repeatConsoleRequest);
                                            delete repeatConsoleRequest.completed;
                                            delete repeatConsoleRequest.superseded;

                                            this.serviceXhr({
                                                url : Constants.PROXY_URI + 'de/fme/jsconsole/execute',
                                                data : repeatConsoleRequest.rqData,
                                                method : 'POST',
                                                successCallback : lang.hitch(this, this.onExecuteInBackendSuccess, repeatConsoleRequest),
                                                failureCallback : lang.hitch(this, this.onExecuteInBackendFailure, repeatConsoleRequest)
                                            });

                                            repeatConsoleRequest.checkTimer = functionUtils.addRepeatingFunction(lang.hitch(this,
                                                    this.onExecuteInBackendCheckProgress, repeatConsoleRequest), 'MEDIUM');
                                            this._activeRequestByScope[repeatConsoleRequest.alfResponseScope] = repeatConsoleRequest;
                                        }, consoleRequest), consoleRequest.runLikeCrazy);
                            }
                        }

                    });
        });