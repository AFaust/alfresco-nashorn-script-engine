/* globals -require */
/**
 * This module provides the equivalent of the Rhino-ScriptNode API internal
 * childAssocs and parentAssocs maps for a particular node. Other than the
 * Rhino-based maps, this module will not pre-emptively load all types of
 * associations and will provide lists of the actual child associations instead
 * of the parents/children (an additional module provides a facade for the
 * latter).
 * 
 * @module alfresco/node/NodeHierarchyAssociationsMap
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/foundation/NodeService
 * @requires module:alfresco/node/ChildAssociation
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', '../common/QName', 'alfresco/foundation/NodeService', 'alfresco/node/ChildAssociation',
        '_base/logger', 'nashorn!Java' ], function(declare, ProxySupport, QName, NodeService, ChildAssociation, logger, Java)
{
    'use strict';
    var NodeRef, IllegalArgumentException, RegexQNamePattern;

    NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
    RegexQNamePattern = Java.type('org.alfresco.service.namespace.RegexQNamePattern');

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-no-such-property-fallback-to-__get__' : true,

        '--proxy-virtual-getters-enabled' : true,

        '--proxy-virtual-getter-fallback-to-__get__' : true,

        classConstructor : function alfresco_node_NodeHierarchyAssociationsMap__classConstructor(nodeRef, handleParentChildAssociations)
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

            // setup internal state
            Object.defineProperties(this, {
                // identity of backing node
                nodeRef : {
                    value : internalNodeRef
                },
                handleChildAssociations : {
                    value : handleParentChildAssociations !== true
                },
                // map of child associations as exposed to scripts
                // (set/retrieved at least once and converted)
                associations : {
                    value : {}
                }
            });
        },

        /**
         * Retrieves the list of parent/child associations for a specific
         * association type QName from the backing node. The results of this
         * operation may be cached to consistently return the same list as long
         * as no modification is performed via APIs that encapsulate / aggregate
         * this module (i.e. [_NodeHierarchyMixin]{@link module:alfresco/node/_NodeHierarchyMixin}),
         * unless caching is explicitly suppressed.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            type the qualified type name of the child/parent
         *            association to get
         * @param {string|QName|module:alfresco/common/QName}
         *            [qName] the qualified association name of the child/parent
         *            association to get
         * @param {boolean}
         *            [suppressCache] if the operation must ignore any cached
         *            values
         * @returns {module:alfresco/node/ChildAssociation[]} the list of
         *          child/parent associations of the backing node - never null
         */
        getByAssocType : function alfresco_node_NodeHierarchyAssociationsMap__getByAssocType(type, qName, suppressCache)
        {
            var results, assocTypeQName, assocQName, associations, cachedResults;

            assocTypeQName = QName.valueOf(type);
            if (assocTypeQName === undefined || assocTypeQName === null)
            {
                throw new Error('type is a required parameter');
            }

            if (suppressCache === true || !this.associations.hasOwnProperty(assocTypeQName.prefixString))
            {
                logger.debug('Loading {} associations of type {} from {}', this.handleChildAssociations ? 'child' : 'parent',
                        assocTypeQName, this.nodeRef);
                if (this.handleChildAssociations === true)
                {
                    associations = NodeService.getChildAssocs(this.nodeRef, assocTypeQName.qname, RegexQNamePattern.MATCH_ALL);
                }
                else
                {
                    associations = NodeService.getParentAssocs(this.nodeRef, assocTypeQName.qname, RegexQNamePattern.MATCH_ALL);
                }

                cachedResults = [];
                associations.forEach(function alfresco_node_NodeHierarchyAssociationsMap__getByAssocType_forEachAssociation(assoc)
                {
                    cachedResults.push(new ChildAssociation(assoc));
                });

                if (!this.associations.hasOwnProperty(assocTypeQName.prefixString))
                {
                    this.associations[assocTypeQName.prefixString] = cachedResults;
                }
            }
            else
            {
                cachedResults = this.associations[assocTypeQName.prefixString];
            }

            if (qName !== undefined && qName !== null)
            {
                results = [];
                assocQName = QName.valueOf(qName);

                cachedResults.forEach(function alfresco_node_NodeHierarchyAssociationsMap__getByAssocType_forEachCachedResult(childAssoc)
                {
                    if (childAssoc.childQName.prefixString === assocQName.prefixString)
                    {
                        results.push(childAssoc);
                    }
                });
            }
            else
            {
                results = suppressCache ? cachedResults : cachedResults.slice(0);
            }

            return results;
        },

        // this overrides standard __get__ from ProxySupport
        __get__ : function alfresco_node_NodeHierarchyAssociationsMap__get__(name)
        {
            var result;

            logger.trace('__get__ called for {} on {}', name, this.nodeRef);

            result = this.inherited(alfresco_node_NodeHierarchyAssociationsMap__get__, arguments);
            if ((result === undefined || result === null) && typeof name === 'string')
            {
                result = this.getByAssocType(name);
            }

            return result;
        },

        // this overrides standard __has__ from ProxySupport
        __has__ : function alfresco_node_NodeHierarchyAssociationsMap__has__(name)
        {
            var assocTypeQName, associations, result = false;

            logger.trace('__has__ called for {} on {}', name, this.nodeRef);

            result = this.inherited(alfresco_node_NodeHierarchyAssociationsMap__has__, arguments);
            if (!result)
            {
                assocTypeQName = QName.valueOf(name);
                if (assocTypeQName !== undefined && assocTypeQName !== null)
                {
                    if (this.associations.hasOwnProperty(assocTypeQName.prefixString))
                    {
                        result = this.associations[assocTypeQName.prefixString].length > 0;
                    }
                    else
                    {
                        associations = this.getByAssocType(assocTypeQName);
                        result = associations.length > 0;
                    }
                }
            }

            return result;
        },

        // this overrides standard __getIds__ from ProxySupport
        __getIds__ : function alfresco_node_NodeHierarchyAssociationsMap__getIds__()
        {
            var ids = [], qname;

            logger.trace('__getIds__ called on {}', this.nodeRef);

            for (qname in this.associations)
            {
                if (this.associations.hasOwnProperty(qname) && this.associations[qname].length > 0)
                {
                    ids.push(qname);
                }
            }

            return ids;
        },

        // this overrides standard __getIds__ from ProxySupport
        __getValues__ : function alfresco_node_NodeHierarchyAssociationsMap__getValues__()
        {
            var values = [], qname;

            logger.trace('__getValues__ called on {}', this.nodeRef);

            for (qname in this.associations)
            {
                if (this.associations.hasOwnProperty(qname) && this.associations[qname].length > 0)
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
        reset : function alfresco_node_NodeHierarchyAssociationsMap__reset()
        {
            var qname;

            for (qname in this.associations)
            {
                if (this.associations.hasOwnProperty(qname))
                {
                    delete this.associations[qname];
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
        toString : function alfresco_node_NodeHierarchyAssociationsMap__toString()
        {
            // TODO
            return 'NodeHierarchyAssociationsMap';
        }
    });
});
