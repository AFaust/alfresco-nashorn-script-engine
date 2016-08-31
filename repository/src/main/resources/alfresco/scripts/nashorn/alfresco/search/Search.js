define([ 'alfresco/foundation/NamespaceService', 'alfresco/foundation/NodeService', 'alfresco/foundation/PermissionService',
        'alfresco/foundation/SearchService', 'alfresco/node/nodeConversionUtils', '_base/logger', 'nashorn!Java' ],
        function alfresco_search_Search__root(NamespaceService, NodeService, PermissionService, SearchService, nodeConversionUtils, logger,
                Java)
        {
            'use strict';
            var StoreRef, NodeRef, IllegalArgumentException, PermissionServiceAPI, AccessStatus, module;

            StoreRef = Java.type('org.alfresco.service.cmr.repository.StoreRef');
            NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
            IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
            PermissionServiceAPI = Java.type('org.alfresco.service.cmr.security.PermissionService');
            AccessStatus = Java.type('org.alfresco.service.cmr.security.AccessStatus');

            /**
             * This module provides the same abstraction for querying / looking up nodes in the Alfresco repository as the Rhino-based class
             * Search does. Functions that behave differently than the Rhino-based implementation are documentated accordingly. The
             * operations luceneSearch and xpathSearch are not provided as they correspond to internal / technical search languages. These
             * languages are still accessible via [query]{@link module:alfresco/search/Search#query}.
             * 
             * @module alfresco/search/Search
             * @requires module:_base/declare
             * @requires module:alfresco/foundation/NamespaceService
             * @requires module:alfresco/foundation/NodeService
             * @requires module:alfresco/foundation/PermissionService
             * @requires module:alfresco/foundation/SearchService
             * @requires module:_base/logger
             * @requires module:nashorn!Java
             * @author Axel Faust
             */
            module = {

                /**
                 * Looks up the root node of a specific store and returns a script representation of it.
                 * 
                 * @instance
                 * @memberOf module:alfresco/search/Search
                 * @param {string}
                 *            storeType the type of the store
                 * @param {string}
                 *            storeId the identifier of the store
                 * @param {string}
                 *            [nodeModuleId] the name of the script module to use for representing the root node (defaults to
                 *            [alfresco/node/ScriptNode]{@link module:alfresco/node/ScriptNode})
                 * @returns {object} the script representation of the root node or null if the store could not be resolved
                 */
                findRootNode : function alfresco_search_Search__findRootNode(storeType, storeId, nodeModuleId)
                {
                    var storeRef, nodeRef, result = null;

                    logger.trace('Called findRootNode for storeType {}, storeId {} and custom node module {}', storeType, storeId,
                            nodeModuleId);

                    // we could rely on StoreRef constructor validation but this is better
                    if (typeof storeType !== 'string' || storeType.trim() === '')
                    {
                        throw new IllegalArgumentException('storeType should be a non-empty string');
                    }

                    if (typeof storeId !== 'string' || storeId.trim() === '')
                    {
                        throw new IllegalArgumentException('storeId should be a non-empty string');
                    }

                    if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
                    {
                        throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
                    }

                    storeRef = new StoreRef(storeType, storeId);

                    if (NodeService.exists(storeRef))
                    {
                        nodeRef = NodeService.getRootNode(storeRef);
                        result = nodeConversionUtils.convertNode(nodeRef, nodeModuleId);
                        logger.debug('Node {} resolved as root of {} and converted into {}', nodeRef, storeRef, nodeModuleId
                                || 'alfresco/node/ScriptNode');
                    }
                    else
                    {
                        logger.debug('Store {} does not exist', storeRef);
                    }

                    return result;
                },

                /**
                 * Looks up a single node by its reference and returns a script representation of it. The equivalent operation in the
                 * Rhino-based class Search also supports a web script-friendly lookup of patterns like "{store_type}/{store_id}/{node_id}"
                 * or "{store_type}/{store_id}/{path}". This variant is not supported in this module to discourage bad practice and avoid
                 * creep of utility-type functionality into a core module. This module does however provide [findRootNode]{@link module:alfresco/search/Search#findRootNode}
                 * to resolve the root node of a store and use that as the basis for relative lookups.
                 * 
                 * @instance
                 * @memberOf module:alfresco/search/Search
                 * @param {string}
                 *            ref the reference to the node in stringified NodeRef form
                 * @param {string}
                 *            [nodeModuleId] the name of the script module to use for representing the node (defaults to
                 *            [alfresco/node/ScriptNode]{@link module:alfresco/node/ScriptNode})
                 * @returns {object} the script representation of the node or null if it could not be resolved
                 */
                findNode : function alfresco_search_Search__findNode(ref, nodeModuleId)
                {
                    var nodeRef, result = null;

                    logger.trace('Called findNode for ref {} and custom node module {}', ref, nodeModuleId);

                    // we could rely on NodeRef constructor validation but this is better
                    if (typeof ref !== 'string' || ref.trim() === '' || !NodeRef.isNodeRef(ref))
                    {
                        throw new IllegalArgumentException('ref should be a non-empty string in stringified NodeRef-form');
                    }

                    if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
                    {
                        throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
                    }

                    nodeRef = new NodeRef(ref);

                    if (NodeService.exists(nodeRef)
                            && PermissionService.hasPermission(nodeRef, PermissionServiceAPI.READ) === AccessStatus.ALLOWED)
                    {
                        result = nodeConversionUtils.convertNode(nodeRef, nodeModuleId);
                        logger.debug('Node {} resolved and converted into {}', nodeRef, nodeModuleId || 'alfresco/node/ScriptNode');
                    }
                    else
                    {
                        logger.debug('Node {} does not exist', nodeRef);
                    }

                    return result;
                },

                /**
                 * Queries nodes using a service-/database-bound selectNodes XPath lookup.
                 * 
                 * @instance
                 * @memberOf module:alfresco/search/Search
                 * @param {string}
                 *            xpath the actual xpath query
                 * @param {string}
                 *            [store] the store to search as a stringified store reference
                 * @param {string}
                 *            [nodeModuleId] the name of the script module to use for representing the node (defaults to
                 *            [alfresco/node/ScriptNode]{@link module:alfresco/node/ScriptNode})
                 * @returns {array} the script representation of the result nodes
                 */
                selectNodes : function alfresco_search_Search__selectNodes(xpath, store, nodeModuleId)
                {
                    var result, rootNode, nodeRefs;

                    logger.trace('Called selectNodes for store {}, xpath {} and custom node module {}', store, xpath, nodeModuleId);

                    if (typeof xpath !== 'string' || xpath.trim() === '')
                    {
                        throw new IllegalArgumentException('xpath should be a non-empty string');
                    }

                    if (store !== undefined && store !== null
                            && (typeof store !== 'string' || store.replace(/(:\/)?\//ig, '').trim() === ''))
                    {
                        throw new IllegalArgumentException('store should be a non-empty string in stringified StoreRef-form');
                    }

                    store = store || 'workspace://SpacesStore';
                    rootNode = this.findRootNode(store.substring(0, store.indexOf('://')), store.substring(store.indexOf('://') + 3));
                    nodeRefs = SearchService.selectNodes(rootNode.nodeRef, xpath, null, NamespaceService, false);
                    result = nodeConversionUtils.convertNodes(nodeRefs, nodeModuleId || 'alfresco/node/ScriptNode');

                    logger.debug('Found {} nodes using selectNodes for store {} and xpath {}', store, xpath);

                    return result;
                }
            };
            Object.freeze(module);

            return module;
        });