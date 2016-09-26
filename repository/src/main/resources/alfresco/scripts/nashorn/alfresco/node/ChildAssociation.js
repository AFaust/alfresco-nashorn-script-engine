/* globals -require */
/**
 * This module provides a script abstraction of a child association between a
 * parent and a child node.
 * 
 * @module alfresco/node/ChildAssociation
 * @extends module:_base/JavaConvertableMixin
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/node/nodeConversionUtils
 * @requires module:nashorn!Java
 * @requires module:_base/logger
 * @author Axel Faust
 */
define([ '_base/declare', '_base/JavaConvertableMixin', '_base/ProxySupport', 'alfresco/common/QName', './nodeConversionUtils',
        'nashorn!Java', '_base/logger' ], function alfresco_node_ChildAssociation__root(declare, JavaConvertableMixin, ProxySupport, QName,
        nodeConversionUtils, Java, logger)
{
    'use strict';
    var ChildAssociationRef, IllegalArgumentException;

    ChildAssociationRef = Java.type('org.alfresco.service.cmr.repository.ChildAssociationRef');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    return declare([ JavaConvertableMixin, ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-virtual-getters-enabled' : true,

        _internalJavaValueProperty : 'childAssoc',

        classConstructor : function alfresco_node_ChildAssociation__classConstructor(childAssoc)
        {
            if (childAssoc instanceof ChildAssociationRef)
            {
                Object.defineProperties(this, {
                    childAssoc : {
                        value : childAssoc,
                        enumerable : true
                    },
                    primary : {
                        value : childAssoc.isPrimary(),
                        enumerable : true
                    },
                    nthSibling : {
                        value : childAssoc.nthSibling,
                        enumerable : true
                    }
                });
            }
            else
            {
                throw new IllegalArgumentException('childAssoc value invalid: ' + childAssoc);
            }
        },

        /**
         * The Java ChildAssociuationRef object for this instance
         * 
         * @var childAssoc
         * @type {ChildAssociationRef}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */
        /**
         * The type qname for this child association
         * 
         * @var typeQName
         * @type {module:alfresco/common/QName}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */

        /**
         * Retrieves the qualified name of the association type.
         * 
         * @instance
         * 
         * @returns {module:alfresco/common/QName} the qualified name of the
         *          association type
         */
        getTypeQName : function alfresco_node_ChildAssociation__getTypeQName()
        {
            if (this.typeQName === undefined)
            {
                Object.defineProperty(this, 'typeQName', {
                    value : QName.valueOf(this.childAssoc.typeQName),
                    enumerable : true
                });
            }

            return this.typeQName;
        },
        /**
         * The child qname for this child association
         * 
         * @var childQName
         * @type {module:alfresco/common/QName}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */
        /**
         * Retrieves the qualified name of the child.
         * 
         * @instance
         * 
         * @returns {module:alfresco/common/QName} the qualified name of the
         *          child
         */
        getChildQName : function alfresco_node_ChildAssociation__getChildQName()
        {
            if (this.childQName === undefined)
            {
                Object.defineProperty(this, 'childQName', {
                    value : QName.valueOf(this.childAssoc.qName),
                    enumerable : true
                });
            }

            return this.childQName;
        },
        /**
         * The flag indicating if this child association is a primary chil
         * association, i.e. if permissions and deletions cascade / inherit
         * along this relation
         * 
         * @var primary
         * @type {boolean}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */
        /**
         * The number this child association has among all child associations
         * with the same properties (parent, type and child qname)
         * 
         * @var nthSibling
         * @type {number}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */

        /**
         * The parent in this child association
         * 
         * @var parent
         * @type {module:alfresco/node/Node}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */
        /**
         * Retrieves the parent in this child association.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for
         *            representing the parent node (defaults to
         *            [alfresco/node/Node]{@link module:alfresco/node/Node})
         * @returns {object} the parent in this child association - only null
         *          for the parent association of a root node
         */
        getParent : function alfresco_node_ChildAssociation__getParent(nodeModuleId)
        {
            var result;

            if (!this.hasOwnProperty('parent'))
            {
                logger.debug('Initialising parent of {}', this.childAssoc);
                result = nodeConversionUtils.convertNode(this.childAssoc.parentRef);
                Object.defineProperty(this, 'parent', {
                    value : result,
                    enumerable : true
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

            if (result !== null && nodeModuleId !== undefined && nodeModuleId !== result.declaredClass)
            {
                logger.debug('Converting parent of {} to use representation module {}', this.childAssoc, nodeModuleId);
                result = nodeConversionUtils.convertNode(result, nodeModuleId);
            }

            return result;
        },

        /**
         * The child in this child association
         * 
         * @var child
         * @type {module:alfresco/node/Node}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/ChildAssociation
         */
        /**
         * Retrieves the child in this child association.
         * 
         * @instance
         * @param {string}
         *            [nodeModuleId] the name of the script module to use for
         *            representing the child node (defaults to
         *            [alfresco/node/Node]{@link module:alfresco/node/Node})
         * @returns {object} the child in this child association
         */
        getChild : function alfresco_node_ChildAssociation__getChild(nodeModuleId)
        {
            var result;

            if (!this.hasOwnProperty('child'))
            {
                logger.debug('Initialising child of {}', this.childAssoc);
                result = nodeConversionUtils.convertNode(this.childAssoc.childRef);
                Object.defineProperty(this, 'child', {
                    value : result,
                    enumerable : true
                });
            }
            else
            {
                result = this.child;
            }

            if (nodeModuleId !== undefined && (typeof nodeModuleId !== 'string' || nodeModuleId.trim() === ''))
            {
                throw new IllegalArgumentException('nodeModuleId should be a non-empty string');
            }

            if (result !== null && nodeModuleId !== undefined && nodeModuleId !== result.declaredClass)
            {
                logger.debug('Converting child of {} to use representation module {}', this.childAssoc, nodeModuleId);
                result = nodeConversionUtils.convertNode(result, nodeModuleId);
            }

            return result;
        },

        /**
         * Provides a human-readable representation of this child association.
         * 
         * @instance
         * @function
         * @returns {string} human-readable presentation of this child
         *          association
         */
        toString : function alfresco_node_ChildAssociation__toString()
        {
            return String(this.childAssoc);
        }
    });
});
