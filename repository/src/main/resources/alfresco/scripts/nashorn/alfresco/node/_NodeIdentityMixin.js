/* globals -require */
/**
 * This module provides a script abstraction around Alfresco node identity.
 * 
 * @module alfresco/node/_NodeIdentityMixin
 * @requires module:_base/declare
 * @requires module:alfresco/common/QName
 * @requires module:alfresco/foundation/DictionaryService
 * @requires module:alfresco/foundation/NodeService
 * @requires module:alfresco/foundation/FileFolderService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @mixes module:_base/ProxySupport
 */
define([ '_base/declare', '_base/ProxySupport', '../common/QName', '../foundation/DictionaryService', '../foundation/NodeService',
        '../foundation/FileFolderService', '_base/logger', 'nashorn!Java' ], function alfresco_node_NodeIdentityMixin_root(declare,
        ProxySupport, QName, DictionaryService, NodeService, FileFolderService, logger, Java)
{
    'use strict';

    var NodeRef, IllegalArgumentException, ContentModel;

    NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
    ContentModel = Java.type('org.alfresco.model.ContentModel');

    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-setter-redirection-enabled' : true,

        '--proxy-virtual-getters-enabled' : true,

        classConstructor : function alfresco_node_NodeIdentityMixin__classConstructor(nodeRef)
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

            // this is intended to be our only apparent property
            // defined this way since we want it to be immutable
            Object.defineProperty(this, 'nodeRef', {
                value : internalNodeRef,
                enumerable : true
            });
        },

        /**
         * The Java NodeRef object for this instance
         * 
         * @var nodeRef
         * @type {NodeRef}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the Java NodeRef object for this instance
         * 
         * @instance
         * @returns {NodeRef} the Java NodeRef object for this instance
         */
        getNodeRef : function alfresco_node_NodeIdentityMixin__getNodeRef()
        {
            return this.nodeRef;
        },

        /**
         * The ID fragment of the NodeRef
         * 
         * @var id
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the ID fragment of the underlying NodeRef
         * 
         * @instance
         * @returns {string} the ID fragment
         */
        getId : function alfresco_node_NodeIdentityMixin__getId()
        {
            return this.nodeRef.id;
        },

        /**
         * The store protocol fragment of the NodeRef
         * 
         * @var protocol
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the store protocol fragment of the underlying NodeRef
         * 
         * @instance
         * @returns {string} the store protocol fragment
         */
        getProtocol : function alfresco_node_NodeIdentityMixin__getProtocol()
        {
            return this.nodeRef.storeRef.protocol;
        },

        /**
         * The store type fragment of the NodeRef - this is equivalent to [protocol]{@link module:alfresco/node/_NodeIdentityMixin#protocol}
         * for compatibility reasons with legacy API
         * 
         * @var storeType
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the store type fragment of the underlying NodeRef - this is equivalent to [getProtocol]{@link module:alfresco/node/_NodeIdentityMixin#getProtocol}
         * for compatibility reasons with legacy API
         * 
         * @instance
         * @returns {string} the store type fragment
         */
        getStoreType : function alfresco_node_NodeIdentityMixin__getStoreType()
        {
            return this.nodeRef.storeRef.protocol;
        },

        /**
         * The store ID fragment of the NodeRef
         * 
         * @var storeId
         * @type {string}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the store ID fragment of the underlying NodeRef
         * 
         * @instance
         * @returns {string} the store ID fragment
         */
        getStoreId : function alfresco_node_NodeIdentityMixin__getStoreId()
        {
            return this.nodeRef.storeRef.identifier;
        },

        /**
         * The type qname for this node. Setting this property will try to specialize the type of the node and fail if the types are
         * incompatible.
         * 
         * @var qnameType
         * @type {module:alfresco/common/QName}
         * @instance
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the type qname of this node
         * 
         * @instance
         * @return {module:alfresco/common/QName} the type qname
         */
        // due to potential case diferences (xy.qnameType / xy.qNameType) we provide this getter
        getQnameType : function alfresco_node_NodeIdentityMixin__getQnameType()
        {
            return this.getQNameType();
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible.
         * 
         * @instance
         * @param {module:alfresco/common/QName}
         *            qnameType the qname of the sub-type for the node
         * @returns {module:alfresco/common/QName} the qname the new type
         */
        setQnameType : function alfresco_node_NodeIdentityMixin__setQnameType(qnameType)
        {
            return this.setQNameType(qnameType);
        },

        /**
         * The type qname for this node - this is equivalent to [qnameType]{@link module:alfresco/node/_NodeIdentityMixin#qnameType} for
         * compatibility reasons with legacy API. Setting this property will try to specialize the type of the node and fail if the types
         * are incompatible.
         * 
         * @var qNameType
         * @type {module:alfresco/common/QName}
         * @instance
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the type qname of this node - this is equivalent to [getQnameType]{@link module:alfresco/node/_NodeIdentityMixin#getQnameType}
         * for compatibility reasons with legacy API.
         * 
         * @instance
         * @return {module:alfresco/common/QName} the type qname
         */
        getQNameType : function alfresco_node_NodeIdentityMixin__getQNameType()
        {
            var qnameType;
            if (!this.hasOwnProperty('_qnameType'))
            {
                qnameType = QName.valueOf(NodeService.getType(this.nodeRef));
                // just an internally cached value
                Object.defineProperty(this, '_qnameType', {
                    value : qnameType,
                    writable : true
                });
            }

            return this.qnameType;
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible - this is equivalent to [setQnameType]{@link module:alfresco/node/_NodeIdentityMixin#setQnameType}
         * for compatibility reasons with legacy API.
         * 
         * @instance
         * @param {module:alfresco/common/QName}
         *            qnameType the qname of the sub-type for the node
         * @returns {module:alfresco/common/QName} the qname the new type
         */
        setQNameType : function alfresco_node_NodeIdentityMixin__setQNameType(qnameType)
        {
            var result;
            // TODO Introduce type check
            if (qnameType === this.getQNameType() || this.getQNameType().qname.equals(qnameType.qname || null))
            {
                result = qnameType;
            }
            else if (!this.specializeType(qnameType))
            {
                throw new Error('Node type could not be specialized to ' + qnameType);
            }
            else
            {
                result = this.getQNameType();
            }

            return result;
        },

        /**
         * The long form string representation of the type of this node. Setting this property will try to specialize the type of the node
         * and fail if the types are incompatible.
         * 
         * @var type
         * @type {string}
         * @instance
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the long form string representation of the type of this node
         * 
         * @instance
         * @return {string} the long form string representation of the type
         */
        getType : function alfresco_node_NodeIdentityMixin__getType()
        {
            var qnameType, type;

            qnameType = this.getQNameType();
            type = qnameType.fullString;

            return type;
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible.
         * 
         * @instance
         * @param {string}
         *            type the long form string representation of the sub-type for the node
         * @returns {string} the long form string representation of the new type
         */
        setType : function alfresco_node_NodeIdentityMixin__setType(type)
        {
            var result;
            if (type === this.getType())
            {
                result = type;
            }
            else if (!this.specializeType(type))
            {
                throw new Error('Node type could not be specialized to ' + type);
            }
            else
            {
                result = this.getType();
            }

            return result;
        },

        /**
         * The prefixed string representation of the type of this node. Setting this property will try to specialize the type of the node
         * and fail if the types are incompatible.
         * 
         * @var typeShort
         * @type {string}
         * @instance
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the prefixed string representation of the type of this node
         * 
         * @instance
         * @return {string} the prefixed string representation of the type
         */
        getTypeShort : function alfresco_node_NodeIdentityMixin__getTypeShort()
        {
            var qnameType, type;

            qnameType = this.getQNameType();
            type = qnameType.prefixString;

            return type;
        },

        /**
         * Sets the type of the node to a specialized sub-type if possible.
         * 
         * @instance
         * @param {string}
         *            typeShort the prefixed string representation of the sub-type for the node
         * @returns {string} the prefixed string representation of the new type
         */
        setTypeShort : function alfresco_node_NodeIdentityMixin__setTypeShort(typeShort)
        {
            var result;
            if (typeShort === this.getTypeShort())
            {
                result = typeShort;
            }
            else if (!this.specializeType(typeShort))
            {
                throw new Error('Node type could not be specialized to ' + typeShort);
            }
            else
            {
                result = this.getTypeShort();
            }

            return result;
        },

        /**
         * Sets the type of the node to a specialized sub-type.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            type the sub-type for the node
         * @returns {boolean} true if the node was specialized, false otherwise
         */
        specializeType : function alfresco_node_NodeIdentityMixin__specializeType(type)
        {
            var qname, currentTypeQName, result = false;

            qname = QName.valueOf(type);
            if (qname === undefined || qname === null)
            {
                throw new Error('type is a required parameter');
            }

            currentTypeQName = this.getQNameType();

            if (!currentTypeQName.qname.equals(qname.qname) && DictionaryService.isSubClass(qname.qname, currentTypeQName.qname))
            {
                NodeService.setType(this.nodeRef, qname.qname);
                // update internally cached value
                this._qnameType = qname;
                result = true;
            }

            return result;
        },

        /**
         * The array of long form string representations for all aspects applied to the node
         * 
         * @var aspects
         * @type {array}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the aspects applied to the node in their long form string representation
         * 
         * @instance
         * @returns {array} the applied aspects in long form string representation
         */
        getAspects : function alfresco_node_NodeIdentityMixin__getAspects()
        {
            var aspectsLong, aspects;
            aspects = this._getAspectsQName();
            aspectsLong = [];
            aspects.forEach(function alfresco_node_NodeIdentityMixin__getAspects__forEachAspect(aspect)
            {
                aspectsLong.push(aspect.fullString);
            });

            return aspectsLong;
        },

        /**
         * The array of prefixed string representations for all aspects applied to the node
         * 
         * @var aspectsShort
         * @type {array}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the aspects applied to the node in their prefixed string representation
         * 
         * @instance
         * @returns {array} the applied aspects in prefixed string representation
         */
        getAspectsShort : function alfresco_node_NodeIdentityMixin__getAspectsShort()
        {
            var aspectsShort, aspects;
            aspects = this._getAspectsQName();
            aspectsShort = [];
            aspects.forEach(function alfresco_node_NodeIdentityMixin__getAspectsShort__forEachAspect(aspect)
            {
                aspectsShort.push(aspect.prefixString);
            });

            return aspectsShort;
        },

        /**
         * Retrieves the aspects applied to the node
         * 
         * @instance
         * @private
         * @returns {array} the applied aspects
         */
        _getAspectsQName : function alfresco_node_NodeIdentityMixin__getAspectsQName()
        {
            var aspects, aspectQNames;
            if (!this.hasOwnProperty('_aspectQNames'))
            {
                aspects = NodeService.getAspects(this.nodeRef);
                aspectQNames = [];
                aspects.forEach(function alfresco_node_NodeIdentityMixin__getAspectsQName_forEachAspect(aspect)
                {
                    aspectQNames.push(QName.valueOf(aspect));
                });

                // just an internally cached value
                Object.defineProperty(this, '_aspectQNames', {
                    value : aspectQNames,
                    configurable : true
                });
            }

            return this.aspectQNames;
        },

        // TODO Aspect addition / removal

        /**
         * Flag wether the node represented by this instance exists or not. For compatibility with legacy API this property can also be
         * called as a function.
         * 
         * @var exists
         * @type {boolean}
         * @instance
         * @readonly
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Checks if the node represented by this instance exists or not
         * 
         * @instance
         * @return {boolean} true if the node exists, false otherwise
         */
        // provides the shorthand xy.exists property
        // we aim to provide both property and exists() method of Rhino ScriptNode by implementing the __call__ extension hook)
        getExists : function alfresco_node_NodeIdentityMixin__getExists()
        {
            return NodeService.exists(this.nodeRef);
        },

        /**
         * The name of the node represented by this instance
         * 
         * @var name
         * @type {string}
         * @instance
         * @memberof module:alfresco/node/_NodeIdentityMixin
         */
        /**
         * Retrieves the name of the node represented by this instance
         * 
         * @instance
         * @return {string} the name (cm:name) of the node
         */
        getName : function alfresco_node_NodeIdentityMixin__getName()
        {
            // This is a trivial approach to get name (based on Rhino ScriptNode but without any caching as name might change at runtime)
            var name, parentRef, childAssocQName;

            name = NodeService.getProperty(this.nodeRef, ContentModel.PROP_NAME);

            if (name === null)
            {
                parentRef = NodeService.getPrimaryParent(this.nodeRef);
                if (parentRef !== null)
                {
                    childAssocQName = parentRef.getQName();
                    if (childAssocQName !== null)
                    {
                        name = childAssocQName.localName;
                    }
                }
            }

            return name || '';
        },

        /**
         * Sets the name of the node represented by this instance
         * 
         * @instance
         * @param {string}
         *            name the new name (cm:name) of the node
         */
        setName : function alfresco_node_NodeIdentityMixin__setName(name)
        {
            var qnameType;

            // This is a trivial approach to set name (based on Rhino ScriptNode but without any property caching)
            if (typeof name === 'string')
            {
                qnameType = NodeService.getType(this.nodeRef);

                if ((DictionaryService.isSubClass(qnameType, ContentModel.TYPE_FOLDER) && !DictionaryService.isSubClass(qnameType,
                        ContentModel.TYPE_SYSTEM_FOLDER))
                        || DictionaryService.isSubClass(qnameType, ContentModel.TYPE_CONTENT))
                {
                    FileFolderService.rename(this.nodeRef, name);
                }
                else
                {
                    NodeService.setProperty(this.nodeRef, ContentModel.PROP_NAME, name);
                }
            }
        },

        __call__ : function alfresco_node_NodeIdentity__call__(name)
        {
            var result;

            logger.trace('__call__ called for {}', name);

            if (typeof this[name] === 'function')
            {
                // better performance if we short-cut
                result = this[name].apply(this, Array.prototype.slice.call(arguments, 1));
            }
            else
            {
                switch (name)
                {
                    case 'exists':
                        result = this.getExists();
                        break;
                    default:
                        result = this.inherited(alfresco_node_NodeIdentity__call__, arguments);
                }
            }

            logger.trace('__call__ for {} yielded {}', name, result);

            return result;
        },

        /**
         * Provides a human readable string representation of this instance
         * 
         * @instance
         * @returns {string} the human readable string representation
         */
        toString : function alfresco_node_NodeIdentity__toString()
        {
            return String(this.nodeRef);
        }
    });
});