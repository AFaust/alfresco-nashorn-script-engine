define([ '_base/declare', 'alfresco/foundation/NodeService', 'alfresco/foundation/PermissionService', '_base/logger', 'nashorn!Java' ],
        function alfresco_search_Search__root(declare, NodeService, PermissionService, logger, Java)
        {
            'use strict';
            var StoreRef, NodeRef, IllegalArgumentException, PermissionServiceAPI, AccessStatus, convertNode, convertNodes, module;

            StoreRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
            NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
            IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
            PermissionServiceAPI = Java.type('org.alfresco.service.cmr.security.PermissionService');
            AccessStatus = Java.type('org.alfresco.service.cmr.security.AccessStatus');

            convertNode = function alfresco_search_Search__convertNode(nodeRef, nodeModuleId)
            {
                var result;

                require([ nodeModuleId || 'alfresco/node/ScriptNode' ], function alfresco_search_Search__convertNode_requireCallback(
                        NodeModule)
                {
                    if (typeof NodeModule.valueOf === 'function' && NodeModule.valueOf !== Object.prototype.valueOf)
                    {
                        logger.trace('Node module {} provides a valueOf', nodeModuleId);
                        result = NodeModule.valueOf(nodeRef);
                    }
                    else if (typeof NodeModule === 'function')
                    {
                        logger.trace('Node module {} assumed to be instantiable', nodeModuleId);
                        result = new NodeModule(nodeRef);
                    }
                    else
                    {
                        throw new IllegalArgumentException('Unsupported node module: ' + nodeModuleId);
                    }
                });

                return result;
            };

            convertNodes = function alfresco_search_Search__convertNodes(nodeRefs, nodeModuleId)
            {
                var result = [];

                require([ nodeModuleId || 'alfresco/node/ScriptNode' ], function alfresco_search_Search__convertNodes_requireCallback(
                        NodeModule)
                {
                    if (typeof NodeModule.valueOf === 'function' && NodeModule.valueOf !== Object.prototype.valueOf)
                    {
                        logger.trace('Node module {} provides a valueOf', nodeModuleId);
                    }
                    else if (typeof NodeModule === 'function')
                    {
                        logger.trace('Node module {} assumed to be instantiable', nodeModuleId);
                    }
                    else
                    {
                        throw new IllegalArgumentException('Unsupported node module: ' + nodeModuleId);
                    }

                    nodeRefs.forEach(function alfresco_search_Search__convertNodes_requireCallback_forEachNodeRef(nodeRef)
                    {
                        var node;
                        if (typeof NodeModule.valueOf === 'function')
                        {
                            node = NodeModule.valueOf(nodeRef);
                        }
                        else
                        {
                            node = new NodeModule(nodeRef);
                        }
                        result.push(node);
                    });
                });

                return result;
            };

            /**
             * This module provides the same abstraction for querying / looking up nodes in the Alfresco repository as the Rhino-based class
             * Search does. Functions that behave differently than the Rhino-based implementation are documentated accordingly.
             * 
             * @module alfresco/search/Search
             * @requires module:_base/declare
             * @requires module:alfresco/foundation/NodeService
             * @requires module:alfresco/foundation/PermissionService
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

                    logger.trace('Looking up root node of {}://{}', storeType, storeId);

                    storeRef = new StoreRef(storeType, storeId);

                    if (NodeService.exists(storeRef))
                    {
                        nodeRef = NodeService.getRootNode(storeRef);
                        result = convertNode(nodeRef, nodeModuleId);
                        logger.debug('Node {} resolved as root of {}://{} and converted into {}', nodeRef, storeType, storeId, nodeModuleId
                                || 'alfresco/node/ScriptNode');
                    }
                    else
                    {
                        logger.debug('Store {}://{} does not exist', storeType, storeId);
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

                    // we could rely on NodeRef constructor validation but this is better
                    if (typeof ref !== 'string' || ref.trim() === '' || !NodeRef.isNodeRef(ref))
                    {
                        throw new IllegalArgumentException('ref should be a non-empty string in stringified NodeRef-form');
                    }

                    if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
                    {
                        throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
                    }

                    logger.trace('Looking up node {}', ref);

                    nodeRef = new NodeRef(ref);

                    if (NodeService.exists(nodeRef)
                            && PermissionService.hasPermission(nodeRef, PermissionServiceAPI.READ) === AccessStatus.ALLOWED)
                    {
                        result = convertNode(nodeRef, nodeModuleId);
                        logger.debug('Node {} resolved and converted into {}', ref, nodeModuleId || 'alfresco/node/ScriptNode');
                    }
                    else
                    {
                        logger.debug('Node {} does not exist', ref);
                    }

                    return result;
                }
            };
            Object.freeze(module);

            return module;
        });