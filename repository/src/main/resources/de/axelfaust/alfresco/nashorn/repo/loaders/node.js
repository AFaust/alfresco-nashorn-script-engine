/* globals -require */
(function()
{
    'use strict';

    // despite this file's name it has nothing to do with Node.js

    define(
            'node',
            [ 'define', 'nashorn!Java', 'serviceRegistry!NamespaceService', 'serviceRegistry!DictionaryService',
                    'serviceRegistry!NodeService', 'serviceRegistry!ContentService', 'serviceRegistry!FileFolderService',
                    'serviceRegistry!SearchService' ],
            function node_loader(define, Java, NamespaceService, DictionaryService, NodeService, ContentService, FileFolderService,
                    SearchService)
            {
                var loader, logger, QName, DataTypeDefinition, StoreRef, NodeRef, ContentModel, URL, URLStreamHandler, NodeURLStreamHandler, NodeURLConnection, isObject, resolveQName, isContentProperty, resolveToContentNode, extractParamsFromModuleId, normalizeImpl;

                logger = Java.type('org.slf4j.LoggerFactory').getLogger(
                        'de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptProcessor.loader.node');
                QName = Java.type('org.alfresco.service.namespace.QName');
                DataTypeDefinition = Java.type('org.alfresco.service.cmr.dictionary.DataTypeDefinition');
                StoreRef = Java.type('org.alfresco.service.cmr.repository.StoreRef');
                NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
                ContentModel = Java.type('org.alfresco.model.ContentModel');

                URL = Java.type('java.net.URL');
                URLStreamHandler = Java.type('java.net.URLStreamHandler');
                NodeURLConnection = Java.type('de.axelfaust.alfresco.nashorn.repo.loaders.NodeURLConnection');

                // TODO Try to optimize by moving into actual Java class (which may call back into JS)
                NodeURLStreamHandler = Java.extend(URLStreamHandler, {
                    openConnection : function node_loader__NodeURLStreamHandler_openConnection(url)
                    {
                        var con, params, nodeRef;

                        params = extractParamsFromModuleId(url.file);
                        nodeRef = resolveToContentNode(params.nodeRef || params.storeRef, params.pathFragments);

                        if (params.contentProperty !== undefined && params.contentProperty !== null)
                        {
                            con = new NodeURLConnection(url, NodeService, ContentService, nodeRef, params.contentProperty);
                        }
                        else
                        {
                            con = new NodeURLConnection(url, NodeService, ContentService, nodeRef);
                        }

                        return con;
                    }
                });

                isObject = function node_loader__isObject(o)
                {
                    var result = o !== undefined && o !== null && Object.prototype.toString.call(o) === '[object Object]';
                    return result;
                };

                resolveQName = function node_loader__resolveQName(str)
                {
                    var qname, firstIndex;

                    qname = QName.resolveToQName(NamespaceService, str);

                    if (qname !== null && qname.namespaceURI === '')
                    {
                        firstIndex = str.indexOf('_');
                        if (firstIndex !== -1)
                        {
                            str = str.substring(0, firstIndex) + ':' + str.substring(firstIndex + 1);
                            qname = QName.resolveToQName(NamespaceService, str);
                        }
                    }

                    if (qname !== null && qname.namespaceURI === '')
                    {
                        qname = null;
                    }

                    return qname;
                };

                isContentProperty = function node_loader__isContentProperty(str)
                {
                    var qname, property, result;

                    qname = resolveQName(str);

                    if (qname !== null)
                    {
                        property = DictionaryService.getProperty(qname);
                        if (property !== null)
                        {
                            result = DataTypeDefinition.CONTENT.equals(property.dataType.name);
                        }
                        else
                        {
                            result = false;
                        }
                    }
                    else
                    {
                        result = false;
                    }

                    return result;
                };

                resolveToContentNode = function node_loader__resolveToContentNode(context, pathFragments)
                {
                    var currentNode, fileInfo, result, fileFragment, suffixes = [ '', '.nashornjs', '.js' ], suffixIdx, fragmentIdx, children;

                    if (pathFragments.length > 0)
                    {
                        if (context instanceof StoreRef)
                        {
                            currentNode = NodeService.getRootNode(context);
                        }
                        else
                        {
                            currentNode = context;
                        }

                        // we don't really expect direct resolution to work since module id should not contain file extension
                        // also, parts of path may not be supported by FileFolderService
                        fileFragment = pathFragments[pathFragments.length - 1];
                        if ((/.+?\.[^$\.]+$/).test(fileFragment))
                        {
                            // already contains explicit suffix
                            if (logger.traceEnabled)
                            {
                                logger.trace('Trying to resolve "{}" starting from "{}" via FileFolderService', pathFragments.join('/'),
                                        currentNode);
                            }
                            fileInfo = FileFolderService.resolveNamePath(currentNode, Java.to(pathFragments, 'java.util.List'), false);
                        }
                        else
                        {
                            // try suffixes until we find a fileInfo
                            for (suffixIdx = 0; suffixIdx < suffixes.length && (fileInfo === undefined || fileInfo === null); suffixIdx += 1)
                            {
                                pathFragments[pathFragments.length - 1] = fileFragment + suffixes[suffixIdx];
                                if (logger.traceEnabled)
                                {
                                    logger.trace('Trying to resolve "{}" starting from "{}" via FileFolderService',
                                            pathFragments.join('/'), currentNode);
                                }
                                fileInfo = FileFolderService.resolveNamePath(currentNode, Java.to(pathFragments, 'java.util.List'), false);
                            }
                        }
                        pathFragments[pathFragments.length - 1] = fileFragment;

                        if (fileInfo !== null)
                        {
                            if (logger.traceEnabled)
                            {
                                logger.trace('Resolved path fragments "{}" and context "{}" to file info "{}"', pathFragments.join('/'),
                                        context, fileInfo);
                            }
                            result = !fileInfo.directory ? fileInfo.nodeRef : null;
                        }
                        else
                        {
                            // manual resolution - script may be located in locations not supported by FileFolderService
                            if (logger.traceEnabled)
                            {
                                logger.trace('Trying to resolve "{}" starting from "{}" via manual SearchService iteration', pathFragments
                                        .join('/'), currentNode);
                            }

                            // NodeService.getChildAssocsByPropertyValue does not support selection by cm:name
                            // NodeService.getChildrenByName requires restriction to specific type of association
                            // TODO Find ways to improve (potential worst-case) performance of SearchService approach
                            for (fragmentIdx = 0; fragmentIdx < pathFragments.length; fragmentIdx += 1)
                            {
                                children = SearchService.query(currentNode.storeRef, 'fts-alfresco', 'PARENT:"' + currentNode
                                        + '" AND =cm:name:"' + pathFragments[fragmentIdx] + '"').nodeRefs;

                                if (children.length === 1)
                                {
                                    currentNode = children[0];
                                }
                                else if (children.length === 0 && pathFragments[fragmentIdx] === fileFragment
                                        && !(/.+?\.[^$\.]+$/).test(fileFragment))
                                {
                                    // try suffixes until we find at least a single child
                                    for (suffixIdx = 1; suffixIdx < suffixes.length; suffixIdx += 1)
                                    {
                                        children = SearchService.query(currentNode.storeRef, 'fts-alfresco', 'PARENT:"' + currentNode
                                                + '" AND =cm:name:"' + pathFragments[fragmentIdx] + suffixes[suffixIdx] + '"');

                                        if (children.length === 1)
                                        {
                                            currentNode = children[0];
                                            break;
                                        }

                                        if (children.length !== 0)
                                        {
                                            currentNode = null;
                                            break;
                                        }
                                    }
                                }
                                else
                                {
                                    currentNode = null;
                                    break;
                                }
                            }

                            if (currentNode === null
                                    || DictionaryService.isSubClass(NodeService.getType(currentNode), ContentModel.TYPE_CONTENT))
                            {
                                result = currentNode;
                            }
                            else
                            {
                                result = null;
                            }
                        }
                    }
                    else if (context instanceof NodeRef)
                    {
                        if (DictionaryService.isSubClass(NodeService.getType(context), ContentModel.TYPE_CONTENT))
                        {
                            result = context;
                        }
                        else
                        {
                            result = null;
                        }
                    }
                    else
                    {
                        result = null;
                    }

                    if (logger.debugEnabled)
                    {
                        logger.debug('Resolved node "{}" from context "{}" and path fragments "{}"', result, context, pathFragments
                                .join('/'));
                    }

                    return result;
                };

                extractParamsFromModuleId = function node_loader__extractParamsFromModuleId(baseModuleId)
                {
                    var fragments, storeRef, nodeRef, subId, pathFragments, contentProperty, len, result;

                    logger.trace('Extracting parameters from module id "{}"', baseModuleId);

                    // to even consider potential node we require a StoreRef and node UID and/or relative path
                    fragments = baseModuleId.split('/');
                    if (fragments.length >= 3)
                    {
                        storeRef = new StoreRef(fragments[0], fragments[1]);
                        if (NodeService.exists(storeRef))
                        {
                            logger.trace('Module id "{}" begins with a StoreRef', baseModuleId);
                            for (len = fragments.length; len > 2; len -= 1)
                            {
                                subId = fragments.slice(2, len).join('/');

                                nodeRef = new NodeRef(storeRef, subId);
                                if (NodeService.exists(nodeRef))
                                {
                                    logger.trace('Module id "{}" begins with a valid NodeRef to the existing node "{}"', baseModuleId,
                                            nodeRef);
                                    pathFragments = fragments.slice(len);
                                    break;
                                }
                                nodeRef = null;
                            }

                            if (nodeRef === undefined || nodeRef === null)
                            {
                                pathFragments = fragments.slice(2);
                            }
                        }
                        else
                        {
                            // assume path from store root
                            storeRef = StoreRef.STORE_REF_WORKSPACE_SPACESSTORE;
                            pathFragments = fragments;
                        }
                    }
                    else
                    {
                        // assume path from store root
                        storeRef = StoreRef.STORE_REF_WORKSPACE_SPACESSTORE;
                        pathFragments = fragments;
                    }

                    if (pathFragments.length > 0 && isContentProperty(pathFragments[pathFragments.length - 1]))
                    {
                        contentProperty = resolveQName(fragments[pathFragments.length - 1]);
                        logger.trace('Module id "{}" explicitely references the content property "{}"', baseModuleId, contentProperty);
                        pathFragments.splice(pathFragments.length - 1, 1);
                    }

                    // check only because we join the path fragments
                    if (logger.debugEnabled)
                    {
                        logger.debug(
                                'Extracted parameters from module id "{}": storeRef={}, nodeRef={}, pathFragments={}, contentProperty={}',
                                baseModuleId, storeRef, nodeRef, pathFragments.join('/'), contentProperty);
                    }

                    result = {
                        fragments : fragments,
                        pathFragments : pathFragments,
                        storeRef : storeRef,
                        nodeRef : nodeRef,
                        contentProperty : contentProperty
                    };

                    return result;
                };

                normalizeImpl = function node_loader__normalizeImpl(baseModuleId)
                {
                    var params, nodeRef, pathFragments, normalizedModuleId, property, firstIndex;

                    params = extractParamsFromModuleId(baseModuleId);

                    nodeRef = resolveToContentNode(params.nodeRef || params.storeRef, params.pathFragments);

                    if (nodeRef !== null)
                    {
                        pathFragments = Java.from(FileFolderService.getNameOnlyPath(NodeService.getRootNode(params.storeRef),
                                params.nodeRef));

                        if (params.contentProperty !== undefined && params.contentProperty !== null)
                        {
                            property = params.contentProperty.toPrefixString(NamespaceService);
                            firstIndex = property.indexOf(':');
                            property = property.substring(0, firstIndex) + '_' + property.substring(firstIndex + 1);
                            pathFragments.push(property);
                        }

                        // need to prefix with store for uniqueness of path (and re-resolution during load)
                        pathFragments.splice(0, 0, nodeRef.storeRef.protocol, nodeRef.storeRef.identifier);
                        normalizedModuleId = pathFragments.join('/');
                    }
                    else
                    {
                        normalizedModuleId = baseModuleId;
                    }

                    return normalizedModuleId;
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
                                logger
                                        .trace(
                                                'Context module "{}" was loaded by "node" loader too - normalizing potentially relative module id "{}"',
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

                        normalizedModuleId = normalizeImpl(baseModuleId);
                        logger.debug('Normalized module id "{}" to "{}"', moduleId, normalizedModuleId);

                        return normalizedModuleId;
                    },

                    load : function node_loader__load(normalizedId, /* jshint unused: false */require/* jshint unused: true */, load)
                    {
                        var urlStreamHandler, url;

                        urlStreamHandler = new NodeURLStreamHandler();

                        url = new URL('node', null, -1, normalizedId, urlStreamHandler);

                        logger.debug('Loading module id {} from node', normalizedId);

                        load(url, true);
                    }
                };

                Object.freeze(loader.normalize);
                Object.freeze(loader.load);
                Object.freeze(loader);

                return define.asSecureUseModule(loader);
            });
}());