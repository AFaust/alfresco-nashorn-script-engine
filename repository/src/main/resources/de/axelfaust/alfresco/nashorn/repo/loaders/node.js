/* globals -require */
/* globals _scriptContextUUID */
// despite this file's name it has nothing to do with Node.js
define('node', [ 'define', 'nashorn!Java', 'serviceRegistry!NamespaceService', 'serviceRegistry!DictionaryService',
        'serviceRegistry!NodeService', 'serviceRegistry!ContentService', 'serviceRegistry!SearchService' ], function node_loader(define,
        Java, NamespaceService, DictionaryService, NodeService, ContentService, SearchService)
{
    'use strict';
    var loader, logger, URL, NodeURLHandler, urlHandler, isObject;

    logger = Java.type('org.slf4j.LoggerFactory').getLogger(
            'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.node');
    URL = Java.type('java.net.URL');
    NodeURLHandler = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.NodeURLHandler');
    urlHandler = new NodeURLHandler(NamespaceService, DictionaryService, NodeService, ContentService, SearchService);

    isObject = function node_loader__isObject(o)
    {
        var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
        return result;
    };

    loader = {
        normalize : function node_loader__normalize(moduleId, normalizeSimpleId, contextModule)
        {
            var normalizedModuleId, baseModuleId;

            normalizedModuleId = moduleId;
            if (isObject(contextModule))
            {
                if (contextModule.loader === 'node')
                {
                    logger.trace('Context module "{}" was loaded by "node" loader too - normalizing potentially relative module id "{}"',
                            contextModule.id, moduleId);
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

            normalizedModuleId = urlHandler.normalizeModuleId(_scriptContextUUID, baseModuleId);
            logger.debug('Normalized module id "{}" to "{}"', moduleId, normalizedModuleId);

            return normalizedModuleId;
        },

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