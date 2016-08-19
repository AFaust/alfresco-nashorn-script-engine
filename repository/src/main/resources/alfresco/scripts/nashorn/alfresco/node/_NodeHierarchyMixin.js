/* globals -require */
/**
 * This mixin module provides the ability to handle hierarchy traversal on a live node in the Alfresco repository.
 * 
 * @module alfresco/node/_NodeHierarchyMixin
 * @extends module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:require
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/foundation/NodeService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', 'require', 'alfresco/common/QName', 'alfresco/foundation/NodeService', '_base/logger',
        'nashorn!Java' ], function alfresco_node_NodeHierarchyMixin__root(declare, ProxySupport, require, QName, NodeService, logger, Java)
{
    'use strict';
    var IllegalArgumentException, convertNode, convertNodes;

    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    // TODO Find out why "new NodeModule(ref)" results in function instead of instance
    convertNode = function alfresco_node_NodeHierarchyMixin__convertNode(node, nodeModuleId)
    {
        var result;

        require([ nodeModuleId ], function alfresco_node_NodeHierarchyMixin__convertNode_requireCallback(NodeModule)
        {
            var ref = node.nodeRef || node;
            if (typeof NodeModule.valueOf === 'function')
            {
                result = NodeModule.valueOf(ref);
            }
            else
            {
                result = new NodeModule(ref);
            }
        });

        return result;
    };

    convertNodes = function alfresco_node_NodeHierarchyMixin__convertNodes(nodes, nodeModuleId)
    {
        var result = [];

        require([ nodeModuleId ], function alfresco_node_NodeHierarchyMixin__convertNodes_requireCallback(NodeModule)
        {
            nodes.forEach(function alfresco_node_NodeHierarchyMixin__convertNodes_requireCallback_forEachNodeRef(node)
            {
                var ref, resultNode;
                ref = node.nodeRef || node;
                if (typeof NodeModule.valueOf === 'function')
                {
                    resultNode = NodeModule.valueOf(ref);
                }
                else
                {
                    resultNode = new NodeModule(ref);
                }
                result.push(resultNode);
            });
        });

        return result;
    };

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        /**
         * The primary parent of this node
         * 
         * @var parent
         * @type {module:alfresco/node/_NodeHierarchyMixin}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeHierarchyMixin
         */
        /**
         * Retrieves the parent of this node.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for representing the parent node (defaults to the type of this
         *            node)
         * @returns {object} the parent of this node - only null for a root node
         */
        getParent : function alfresco_node_NodeHierarchyMixin__getParent(nodeModuleId)
        {
            var result, parentAssoc;

            if (!this.hasOwnProperty('parent'))
            {
                logger.debug('Initialising parent of {}', this.nodeRef);
                parentAssoc = NodeService.getPrimaryParent(this.nodeRef);

                Object.defineProperty(this, 'parent', {
                    value : parentAssoc.parentRef ? convertNode(parentAssoc.parentRef, this.declaredClass) : null,
                    enumerable : true,
                    configurable : true
                });
            }

            result = this.parent;

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (result !== null && nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting parent of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = convertNode(result, nodeModuleId);
            }

            return result;
        },

        /**
         * The parents of this node
         * 
         * @var parents
         * @type {module:alfresco/node/_NodeHierarchyMixin[]}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeHierarchyMixin
         */
        /**
         * Retrieves the parents of this node.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for representing the parent nodes (defaults to the type of this
         *            node)
         * @returns {array} the parents of this node - only null for a root node
         */
        getParents : function alfresco_node_NodeHierarchyMixin__getParents(nodeModuleId)
        {
            var result, parentAssocs, parentRefs, parents;

            if (!this.hasOwnProperty('parents'))
            {
                logger.debug('Initialising parents of {}', this.nodeRef);

                parentRefs = [];
                parentAssocs = NodeService.getParentAssocs(this.nodeRef);
                parentAssocs.forEach(function alfresco_node_NodeHierarchyMixin__getParents_forEachParent(parentAssoc)
                {
                    if (parentAssoc.parentRef)
                    {
                        parentRefs.push(parentAssoc.parentRef);
                    }
                });
                parents = convertNodes(parentRefs, this.declaredClass);

                Object.defineProperty(this, 'parents', {
                    get : function()
                    {
                        return parents.slice(0);
                    },
                    enumerable : true,
                    configurable : true
                });

                result = parents.slice(0);
            }
            else
            {
                result = this.parents;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting parents of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = convertNodes(result, nodeModuleId);
            }

            return result;
        },

        /**
         * The children of this node
         * 
         * @var children
         * @type {module:alfresco/node/_NodeHierarchyMixin[]}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeHierarchyMixin
         */
        /**
         * Retrieves all children of this node.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for representing the child nodes (defaults to the type of this
         *            node)
         * @returns {array} the children of this node - never null
         */
        getChildren : function alfresco_node_NodeHierarchyMixin__getChildren(nodeModuleId)
        {
            var result, childAssocs, childRefs, children;

            if (!this.hasOwnProperty('children'))
            {
                logger.debug('Initialising children of {}', this.nodeRef);

                childRefs = [];
                childAssocs = NodeService.getChildAssocs(this.nodeRef);
                childAssocs.forEach(function alfresco_node_NodeHierarchyMixin__getChildren_forEachChild(childAssoc)
                {
                    childRefs.push(childAssoc.childRef);
                });
                children = convertNodes(childRefs, this.declaredClass);

                Object.defineProperty(this, 'children', {
                    get : function alfresco_node_NodeHierarchyMixin__getChildren_get()
                    {
                        return children.slice(0);
                    },
                    enumerable : true,
                    configurable : true
                });

                result = children.slice(0);
            }
            else
            {
                result = this.children;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting children of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = convertNodes(result, nodeModuleId);
            }

            return result;
        },

        /**
         * This function provides reset handling of a node, ensuring that all changed data will be discarded and next calls to operations
         * are guaranteed to reflect the current node state. Overrides of this function must always make sure to call inherited().
         */
        reset : function alfresco_node_NodeHierarchyMixin__reset()
        {
            this.inherited(alfresco_node_NodeHierarchyMixin__reset, arguments);
            this.resetHierarchyCaches();
        },

        /**
         * This function provides a specific hook for other modules to call to reset only cached data regarding node hierarchies when other
         * operations may have changed the specific node state.
         */
        resetHierarchyCaches : function alfresco_node_NodeHierarchyMixin__resetHierarchyCaches()
        {
            // reset cached values (that may have been changed externally)
            logger.debug('Resetting hierarchy data of {}', this.nodeRef);
            delete this.parent;
            delete this.parents;
            delete this.children;
        }
    });
});