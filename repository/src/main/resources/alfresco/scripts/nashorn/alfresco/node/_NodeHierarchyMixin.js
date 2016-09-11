/**
 * This mixin module provides the ability to handle hierarchy traversal on a
 * live node in the Alfresco repository.
 * 
 * @module alfresco/node/_NodeHierarchyMixin
 * @extends module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/foundation/NodeService
 * @requires module:alfresco/node/NodeHierarchyAssociationsMap
 * @requires module:alfresco/node/NodeHierarchyNodesMap
 * @requires module:alfresco/node/ChildAssociation
 * @requires module:alfresco/node/nodeConversionUtils
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', 'alfresco/common/QName', 'alfresco/foundation/NodeService',
        './NodeHierarchyAssociationsMap', './NodeHierarchyNodesMap', './ChildAssociation', './nodeConversionUtils', '_base/logger',
        'nashorn!Java' ], function alfresco_node_NodeHierarchyMixin__root(declare, ProxySupport, QName, NodeService,
        NodeHierarchyAssociationsMap, NodeHierarchyNodesMap, ChildAssociation, nodeConversionUtils, logger, Java)
{
    'use strict';
    var IllegalArgumentException;

    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        classConstructor : function alfresco_node_NodeHierarchyMixinMap__classConstructor(nodeRef)
        {
            var parentAssocs, childAssocs;

            parentAssocs = new NodeHierarchyAssociationsMap(nodeRef, true);
            childAssocs = new NodeHierarchyAssociationsMap(nodeRef);

            Object.defineProperties(this, {
                parentAssocs : {
                    value : parentAssocs
                },
                childAssocs : {
                    value : childAssocs
                },
                parents : {
                    value : new NodeHierarchyNodesMap(nodeRef, parentAssocs, true)
                },
                children : {
                    value : new NodeHierarchyNodesMap(nodeRef, childAssocs)
                }
            });
        },

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
         * Retrieves the primary parent of this node.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for
         *            representing the parent node (defaults to the type of this
         *            node)
         * @returns {object} the primary parent of this node - only null for a
         *          root node
         */
        getParent : function alfresco_node_NodeHierarchyMixin__getParent(nodeModuleId)
        {
            var result, parentAssoc;

            if (!this.hasOwnProperty('parent'))
            {
                logger.debug('Initialising parent of {}', this.nodeRef);
                parentAssoc = NodeService.getPrimaryParent(this.nodeRef);

                result = parentAssoc.parentRef ? nodeConversionUtils.convertNode(parentAssoc.parentRef, this.declaredClass) : null;
                Object.defineProperty(this, 'parent', {
                    value : result,
                    enumerable : true,
                    configurable : true
                });
            }
            else
            {
                result = this.parent;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (result !== null && nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting parent of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = nodeConversionUtils.convertNode(result, nodeModuleId);
            }

            return result;
        },

        /**
         * The primary parent association of this node
         * 
         * @var parentAssoc
         * @type {module:alfresco/node/ChildAssociation}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeHierarchyMixin
         */
        /**
         * Retrieves the primary parent association of this node.
         * 
         * @instance
         * @returns {object} the primary parent association of this node
         */
        getParentAssoc : function alfresco_node_NodeHierarchyMixin__getParentAssoc()
        {
            var result, parentAssoc;

            if (!this.hasOwnProperty('parentAssoc'))
            {
                logger.debug('Initialising parentAssoc of {}', this.nodeRef);
                parentAssoc = NodeService.getPrimaryParent(this.nodeRef);

                result = new ChildAssociation(parentAssoc);
                Object.defineProperty(this, 'parentAssoc', {
                    value : result,
                    enumerable : true,
                    configurable : true
                });
            }
            else
            {
                result = this.parentAssoc;
            }

            return result;
        },

        /**
         * All parents of this node
         * 
         * @var allParents
         * @type {module:alfresco/node/_NodeHierarchyMixin[]}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeHierarchyMixin
         */
        /**
         * Retrieves all parents of this node.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for *
         *            representing the parent nodes (defaults to the type of
         *            this node)
         * @returns {array} the parents of this node - only null for a root node
         */
        getAllParents : function alfresco_node_NodeHierarchyMixin__getAllParents(nodeModuleId)
        {
            var result, parentAssocs, parentRefs, parents;

            if (!this.hasOwnProperty('allParents'))
            {
                logger.debug('Initialising all parents of {}', this.nodeRef);

                parentRefs = [];
                parentAssocs = NodeService.getParentAssocs(this.nodeRef);
                parentAssocs.forEach(function alfresco_node_NodeHierarchyMixin__getParents_forEachParent(parentAssoc)
                {
                    if (parentAssoc.parentRef)
                    {
                        parentRefs.push(parentAssoc.parentRef);
                    }
                });
                parents = nodeConversionUtils.convertNodes(parentRefs, this.declaredClass);

                Object.defineProperty(this, 'allParents', {
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
                result = this.allParents;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting parents of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = nodeConversionUtils.convertNodes(result, nodeModuleId);
            }

            return result;
        },

        /**
         * All children of this node
         * 
         * @var allChildren
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
         *            [nodeModuleId] the name of the script module to use for
         *            representing the child nodes (defaults to the type of this
         *            node)
         * @returns {array} the children of this node - never null
         */
        getAllChildren : function alfresco_node_NodeHierarchyMixin__getAllChildren(nodeModuleId)
        {
            var result, childAssocs, childRefs, children;

            if (!this.hasOwnProperty('allChildren'))
            {
                logger.debug('Initialising all children of {}', this.nodeRef);

                childRefs = [];
                childAssocs = NodeService.getChildAssocs(this.nodeRef);
                childAssocs.forEach(function alfresco_node_NodeHierarchyMixin__getChildren_forEachChild(childAssoc)
                {
                    childRefs.push(childAssoc.childRef);
                });
                children = nodeConversionUtils.convertNodes(childRefs, this.declaredClass);

                Object.defineProperty(this, 'allChildren', {
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
                result = this.allChildren;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting children of {} to use representation module {}', this.nodeRef, nodeModuleId);
                result = nodeConversionUtils.convertNodes(result, nodeModuleId);
            }

            return result;
        },

        /**
         * This function provides reset handling of a node, ensuring that all
         * changed data will be discarded and next calls to operations are
         * guaranteed to reflect the current node state. Overrides of this
         * function must always make sure to call inherited().
         */
        reset : function alfresco_node_NodeHierarchyMixin__reset()
        {
            this.inherited(alfresco_node_NodeHierarchyMixin__reset, arguments);
            this.resetHierarchyCaches();
        },

        /**
         * This function provides a specific hook for other modules to call to
         * reset only cached data regarding node hierarchies when other
         * operations may have changed the specific node state.
         */
        resetHierarchyCaches : function alfresco_node_NodeHierarchyMixin__resetHierarchyCaches()
        {
            // reset cached values (that may have been changed externally)
            logger.debug('Resetting hierarchy data of {}', this.nodeRef);
            delete this.parent;
            delete this.parentAssoc;
            delete this.allParents;
            this.parentAssocs.reset();
            this.parents.reset();

            delete this.allChildren;
            this.childAssocs.reset();
            this.children.reset();
        },

        /**
         * This function provides a specific hook for other modules to call to
         * reset only cached data regarding parent node hierarchies when other
         * operations may have changed the specific node state.
         */
        resetParentHierarchyCaches : function alfresco_node_NodeHierarchyMixin__resetParentHierarchyCaches()
        {
            logger.debug('Resetting parent hierarchy data of {}', this.nodeRef);
            delete this.parent;
            delete this.parentAssoc;
            delete this.allParents;
            this.parentAssocs.reset();
            this.parents.reset();
        },

        /**
         * This function provides a specific hook for other modules to call to
         * reset only cached data regarding child node hierarchies when other
         * operations may have changed the specific node state.
         */
        resetChildHierarchyCaches : function alfresco_node_NodeHierarchyMixin__resetChildHierarchyCaches()
        {
            logger.debug('Resetting child hierarchy data of {}', this.nodeRef);
            delete this.allChildren;
            this.childAssocs.reset();
            this.children.reset();
        }
    });
});
