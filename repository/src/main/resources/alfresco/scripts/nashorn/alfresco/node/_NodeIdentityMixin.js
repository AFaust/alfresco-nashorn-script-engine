/* globals -require */
/**
 * This module provides a script abstraction around Alfresco node identity.
 * 
 * @module alfresco/node/_NodeIdentityMixin
 * @requires module:_base/declare
 * @requires module:alfresco/foundation/DictionaryService
 * @requires module:alfresco/foundation/NodeService
 * @requires module:alfresco/foundation/FileFolderService
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @mixes module:_base/ProxySupport
 */
define([ '_base/declare', '_base/ProxySupport', '../foundation/DictionaryService', '../foundation/NodeService',
        '../foundation/FileFolderService', '_base/logger', 'nashorn!Java' ], function alfresco_node_NodeIdentityMixin_root(declare,
        ProxySupport, DictionaryService, NodeService, FileFolderService, logger, Java)
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