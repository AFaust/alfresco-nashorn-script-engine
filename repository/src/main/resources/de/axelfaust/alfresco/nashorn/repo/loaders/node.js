/* globals -require */
/* globals SimpleLogger: false */
// despite this file's name it has nothing to do with Node.js
define('node', [ 'define', 'nashorn!Java', 'serviceRegistry!NamespaceService', 'serviceRegistry!DictionaryService',
        'serviceRegistry!NodeService', 'serviceRegistry!PermissionService', 'serviceRegistry!ContentService',
        'serviceRegistry!SearchService' ], function node_loader(define, Java, NamespaceService, DictionaryService, NodeService,
        PermissionService, ContentService, SearchService)
{
    'use strict';
    var loader, logger, URL, NodeURLHandler, urlHandler, NashornScriptModel, executionState, UUID, isObject;

    logger = new SimpleLogger('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.node');
    URL = Java.type('java.net.URL');
    NodeURLHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.NodeURLHandler');
    urlHandler = new NodeURLHandler(NamespaceService, DictionaryService, NodeService, PermissionService, ContentService, SearchService);

    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');
    executionState = NashornScriptModel.newAssociativeContainer();
    UUID = Java.type('java.util.UUID');

    isObject = function node_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    /**
     * This loader module provides the capability to load scripts from Repository content nodes as AMD modules. While normalization of
     * node-based script module IDs uses elevated system privileges to ensure consistent results, the current / runAs user must have read
     * access to the referenced node in order for it to be loaded. This may in the future be restricted to requiring the Execute permission
     * on the node.
     * 
     * @exports node
     * @author Axel Faust
     */
    loader = {
        /**
         * Normalizes a potentially relative module ID to a node-based module ID. In order for relative normalization to work, the module
         * requesting a relative dependency must have been loaded from a nodes content as well.
         * 
         * @instance
         * @param {string}
         *            moduleId - the module ID to normalize
         * @param {function}
         *            normalizeSimpleId - the function handle for the standard (simple) module ID normalization routine
         * @param {object}
         *            [contextModule] - the definition of the module requesting another the module identifier by moduleId
         * @returns {string} the normalized module ID of the requested module
         */
        normalize : function node_loader__normalize(moduleId, normalizeSimpleId, contextModule)
        {
            var normalizedModuleId, baseModuleId, scriptContextUUID;

            normalizedModuleId = moduleId;
            if (isObject(contextModule))
            {
                if (contextModule.loader === 'node')
                {
                    logger.trace('Context module "{}" was loaded by "node" loader too - normalizing potentially relative module id "{}"', [
                            contextModule.id, moduleId ]);
                    baseModuleId = normalizeSimpleId(moduleId, contextModule);
                }
                else
                {
                    baseModuleId = moduleId;
                }
            }
            else
            {
                baseModuleId = moduleId;
            }

            scriptContextUUID = executionState.scriptContextUUID;
            if (scriptContextUUID === undefined || scriptContextUUID === null)
            {
                scriptContextUUID = String(UUID.randomUUID());
                executionState.scriptContextUUID = scriptContextUUID;
            }

            normalizedModuleId = urlHandler.normalizeModuleId(scriptContextUUID, baseModuleId);
            logger.debug('Normalized module id "{}" to "{}"', moduleId, normalizedModuleId);

            return normalizedModuleId;
        },

        /**
         * Loads an Alfresco Repository nodes content as a module from a normalized module ID.
         * 
         * @instance
         * @param {string}
         *            normalizedId - the normalized ID of the module to load
         * @param {function}
         *            require - the context-sensitive require function
         * @param {function}
         *            load - the callback to load either a pre-built object as the module result or a script defining a module from a script
         *            URL
         */
        load : function node_loader__load(normalizedId, require, load)
        {
            var url;

            url = new URL('node', null, -1, normalizedId, urlHandler);

            logger.debug('Loading module id {} from node', normalizedId);

            load(url, true);
        }
    };

    Object.freeze(loader.normalize);
    Object.freeze(loader.load);
    Object.freeze(loader);

    return define.asSecureUseModule(loader);
});