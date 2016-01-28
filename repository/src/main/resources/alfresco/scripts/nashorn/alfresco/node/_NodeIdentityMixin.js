/* globals -require */
define([ '_base/declare', '../common/QName', '../foundation/DictionaryService', '../foundation/NodeService',
        '../foundation/FileFolderService', '_base/logger', 'nashorn!Java' ], function alfresco_node_NodeIdentityMixin_root(declare, QName,
        DictionaryService, NodeService, FileFolderService, logger, Java)
{
    'use strict';

    var NodeRef, IllegalArgumentException, ContentModel;

    NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
    ContentModel = Java.type('org.alfresco.model.ContentModel');

    return declare([], {

        '--declare--proxy-support-enabled' : true,

        '--declare--proxy-getter-redirection-enabled' : true,

        '--declare--proxy-setter-redirection-enabled' : true,

        '--declare--proxy-virtual-getters-enabled' : true,

        '--declare--proxy-extension-hooks-enabled' : true,

        constructor : function alfresco_node_NodeIdentityMixin__contructor(nodeRef)
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
            // defined this way since we want to be immutable
            Object.defineProperty(this, 'nodeRef', {
                value : internalNodeRef,
                enumerable : true
            });
        },

        getId : function alfresco_node_NodeIdentityMixin__getId()
        {
            return this.nodeRef.id;
        },

        getProtocol : function alfresco_node_NodeIdentityMixin__getProtocol()
        {
            return this.nodeRef.storeRef.protocol;
        },

        getStoreType : function alfresco_node_NodeIdentityMixin__getStoreType()
        {
            return this.nodeRef.storeRef.protocol;
        },

        getStoreId : function alfresco_node_NodeIdentityMixin__getStoreId()
        {
            return this.nodeRef.storeRef.identifier;
        },

        // due to potential case diferences (xy.qnameType / xy.qNameType) we provide this getter
        getQnameType : function alfresco_node_NodeIdentityMixin__getQnameType()
        {
            return this.getQNameType();
        },

        getQNameType : function alfresco_node_NodeIdentityMixin__getQNameType()
        {
            var qnameType;
            if (this.qnameType === undefined)
            {
                qnameType = new QName(NodeService.getType(this.nodeRef));
                // just a cached value
                Object.defineProperty(this, 'qnameType', {
                    value : qnameType
                });
            }

            return this.qnameType;
        },

        getType : function alfresco_node_NodeIdentityMixin__getType()
        {
            var qnameType, type;

            qnameType = this.getQNameType();
            type = qnameType.fullString;

            return type;
        },

        getTypeShort : function alfresco_node_NodeIdentityMixin__getTypeShort()
        {
            var qnameType, type;

            qnameType = this.getQNameType();
            type = qnameType.prefixString;

            return type;
        },

        // provides the shorthand xy.exists property
        // we aim to provide both property and exists() method of Rhino ScriptNode by implementing the __call__ extension hook)
        getExists : function alfresco_node_NodeIdentityMixin__getExists()
        {
            return NodeService.exists(this.nodeRef);
        },

        getName : function alfresco_node_NodeIdentityMixin__getName()
        {
            // This is a trivial approach to get name (based on Rhino ScriptNode but without any caching as name might change at runtime)
            // TODO Override in ScriptNode and use internal properties representation
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

        setName : function alfresco_node_NodeIdentityMixin__setName(name)
        {
            var qnameType;

            // This is a trivial approach to set name (based on Rhino ScriptNode but without any property caching)
            // TODO Override in ScriptNode and use internal properties representation

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
            if (name === 'exists' && arguments.length === 1)
            {
                result = this.getExists();
            }
            else
            {
                // TODO Define a core module that defaults __call__ behaviour
                result = this.inherited(alfresco_node_NodeIdentity__call__, arguments);
            }

            return result;
        },

        toString : function alfresco_node_NodeIdentity__toString()
        {
            return String(this.nodeRef);
        }
    });
});