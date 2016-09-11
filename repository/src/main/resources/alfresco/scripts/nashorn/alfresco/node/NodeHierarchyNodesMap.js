/* globals -require */
/**
 * This module provides a simple facade to the [NodeHierarchyAssociationsMap]{@link module:alfresco/node/NodeHierarchyAssociationsMap}
 * to convert list of child associations into simple node representations.
 * 
 * @module alfresco/node/NodeHierarchyNodesMap
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/node/NodeHierarchyAssociationsMap
 * @requires module:alfresco/node/nodeConversionUtils
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', '../common/QName', './NodeHierarchyAssociationsMap', './nodeConversionUtils',
        '_base/logger', 'nashorn!Java' ], function(declare, ProxySupport, QName, NodeHierarchyAssociationsMap, nodeConversionUtils, logger,
        Java)
{
    'use strict';
    var NodeRef, IllegalArgumentException;

    NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-no-such-property-fallback-to-__get__' : true,

        '--proxy-virtual-getters-enabled' : true,

        '--proxy-virtual-getter-fallback-to-__get__' : true,

        classConstructor : function alfresco_node_NodeHierarchyNodesMap__classConstructor(nodeRef, backingAssociationsMap,
                handleParentChildAssociations)
        {
            var internalNodeRef;

            if (typeof nodeRef === 'string')
            {
                internalNodeRef = new NodeRef(nodeRef);
            }
            else if (nodeRef instanceof NodeRef)
            {
                internalNodeRef = nodeRef;
            }
            else if (nodeRef !== undefined && nodeRef !== null)
            {
                internalNodeRef = new NodeRef(String(nodeRef));
            }

            if (internalNodeRef === null)
            {
                throw new IllegalArgumentException('nodeRef value invalid: ' + nodeRef);
            }

            if (backingAssociationsMap === undefined || backingAssociationsMap === null
                    || typeof backingAssociationsMap.isInstanceOf !== 'function'
                    || !backingAssociationsMap.isInstanceOf(NodeHierarchyAssociationsMap))
            {
                throw new IllegalArgumentException('backingAssociationsMap invalid: ' + backingAssociationsMap);
            }

            // setup internal state
            Object.defineProperties(this, {
                // identity of backing node
                nodeRef : {
                    value : internalNodeRef
                },
                backingAssociationsMap : {
                    value : backingAssociationsMap
                },
                handleChildAssociations : {
                    value : handleParentChildAssociations !== true
                },
                // map of nodes as exposed to scripts
                // (set/retrieved at least once and converted)
                nodes : {
                    value : {}
                }
            });
        },

        /**
         * Retrieves the list of parent/child nodes for a specific association
         * type QName from the backing node. The results of this operation may
         * be cached to consistently return the same list as long as no
         * modification is performed via APIs that encapsulate / aggregate this
         * module (i.e. [_NodeHierarchyMixin]{@link module:alfresco/node/_NodeHierarchyMixin}),
         * unless caching is explicitly suppressed.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            type the qualified type name of the child/parent
         *            association to get
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for
         *            representing the parent/child nodes (defaults to
         *            [alfresco/node/Node]{@link module:alfresco/node/Node})
         * @param {string|QName|module:alfresco/common/QName}
         *            [qName] the qualified association name of the child/parent
         *            association to get
         * @param {boolean}
         *            [suppressCache] if the operation must ignore any cached
         *            values
         * @returns {array} the list of child/parent nodes of the backing node -
         *          never null
         */
        getByAssocType : function alfresco_node_NodeHierarchyNodesMap__getByAssocType(type, nodeModuleId, qName, suppressCache)
        {
            var results, assocTypeQName, handleChildren, associations, cachedResults;

            assocTypeQName = QName.valueOf(type);
            if (assocTypeQName === undefined || assocTypeQName === null)
            {
                throw new Error('type is a required parameter');
            }
            handleChildren = this.handleChildAssociations;

            if (suppressCache === true || (qName !== undefined && qName !== null)
                    || !this.nodes.hasOwnProperty(assocTypeQName.prefixString))
            {
                logger.debug('Loading {} referenced by associations of type {} from {}', this.handleChildAssociations ? 'children'
                        : 'parents', assocTypeQName, this.nodeRef);
                associations = this.backingAssociationsMap.getByAssocType(assocTypeQName, qName, suppressCache);

                cachedResults = [];
                associations.forEach(function alfresco_node_NodeHierarchyNodesMap__getByAssocType_forEachAssociation(assoc)
                {
                    cachedResults.push(handleChildren ? assoc.child : assoc.parent);
                });

                if ((qName === undefined || qName === null) && !this.nodes.hasOwnProperty(assocTypeQName.prefixString))
                {
                    this.nodes[assocTypeQName.prefixString] = cachedResults;
                }
            }
            else
            {
                cachedResults = this.nodes[assocTypeQName.prefixString];
            }

            results = (suppressCache || (qName !== undefined && qName !== null)) ? cachedResults : cachedResults.slice(0);

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (nodeModuleId !== undefined && nodeModuleId !== this.declaredClass)
            {
                logger.debug('Converting {} of {} from {} to use representation module {}', handleChildren ? 'children' : 'parents',
                        assocTypeQName, this.nodeRef, nodeModuleId);
                results = nodeConversionUtils.convertNodes(results, nodeModuleId);
            }

            return results;
        },

        // this overrides standard __get__ from ProxySupport
        __get__ : function alfresco_node_NodeHierarchyNodesMap__get__(name)
        {
            var result;

            logger.trace('__get__ called for {} on {}', name, this.nodeRef);

            result = this.inherited(alfresco_node_NodeHierarchyNodesMap__get__, arguments);
            if ((result === undefined || result === null) && typeof name === 'string')
            {
                result = this.getByAssocType(name);
            }

            return result;
        },

        // this overrides standard __has__ from ProxySupport
        __has__ : function alfresco_node_NodeHierarchyNodesMap__has__(name)
        {
            var result;
            logger.trace('__has__ called for {} on {}', name, this.nodeRef);
            result = this.inherited(alfresco_node_NodeHierarchyNodesMap__has__, arguments);
            if (!result)
            {
                result = name in this.backingAssociationsMap;
            }
            return result;
        },

        // this overrides standard __getIds__ from ProxySupport
        __getIds__ : function alfresco_node_NodeHierarchyNodesMap__getIds__()
        {
            var ids = [], qname;

            logger.trace('__getIds__ called on {}', this.nodeRef);

            for (qname in this.backingAssociationsMap)
            {
                if (this.backingAssociationsMap[qname].length > 0)
                {
                    ids.push(qname);
                }
            }

            return ids;
        },

        // this overrides standard __getIds__ from ProxySupport
        __getValues__ : function alfresco_node_NodeHierarchyNodesMap__getValues__()
        {
            var values = [], qname;

            logger.trace('__getValues__ called on {}', this.nodeRef);

            for (qname in this.backingAssociationsMap)
            {
                if (this.backingAssociationsMap[qname].length > 0)
                {
                    values.push(this.getByAssocType(qname));
                }
            }

            return values;
        },

        /**
         * Resets the internal state of this instance, dropping any cached
         * parent/child associations so they are reloaded on next access.
         * 
         * @instance
         * @function
         */
        reset : function alfresco_node_NodeHierarchyNodesMap__reset()
        {
            var qname;

            for (qname in this.nodes)
            {
                if (this.nodes.hasOwnProperty(qname))
                {
                    delete this.nodes[qname];
                }
            }
        },

        /**
         * Provides a human-readable representation of this instance.
         * 
         * @instance
         * @function
         * @returns {string} human-readable presentation of this instance
         */
        toString : function alfresco_node_NodeHierarchyNodesMap__toString()
        {
            // TODO
            return 'NodeHierarchyNodesMap';
        }
    });
});
