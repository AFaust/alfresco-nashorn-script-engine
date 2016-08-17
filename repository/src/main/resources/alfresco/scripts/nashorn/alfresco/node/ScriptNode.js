/* globals -require */
/**
 * This module provides the same abstraction over nodes in the Alfresco repository as the Rhino-based class ScriptNode does. For the most
 * part the API of this module should behave exactly as the Rhino-ScriptNode API does while explicit deviations from this rule are
 * documented on the affected operations.
 * 
 * @module alfresco/node/ScriptNode
 * @mixes module:_base/JavaConvertableMixin
 * @mixes module:alfresco/node/_NodeIdentityMixin
 * @mixes module:alfresco/node/_NodeTypesAndAspectsMixin
 * @mixes module:alfresco/node/_NodePropertiesMixin
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @author Axel Faust
 */
define([ '_base/declare', '_base/JavaConvertableMixin', './_NodeIdentityMixin', './_NodeTypesAndAspectsMixin', './_NodePropertiesMixin',
        '_base/ProxySupport' ], function alfresco_node_ScriptNode_root(declare, JavaConvertableMixin, _NodeIdentityMixin,
        _NodeTypesAndAspectsMixin, _NodePropertiesMixin, ProxySupport)
{
    'use strict';
    return declare([ JavaConvertableMixin, _NodeIdentityMixin, _NodeTypesAndAspectsMixin, _NodePropertiesMixin, ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-setter-redirection-enabled' : true,

        _internalJavaValueProperty : 'nodeRef',

        /**
         * The name of this node
         * 
         * @var name
         * @type {string}
         * @instance
         * @memberof module:alfresco/node/ScriptNode
         */
        /**
         * Retrieves the name of this node. This operation will consider and respect any non-committed/unsaved change to the name of the
         * node either via [setName]{@link module:alfresco/node/ScriptNode#setName} or the map of properties.
         * 
         * @instance
         * @returns {string} the name of the node
         */
        getName : function alfresco_node_ScriptNode__getName()
        {
            var properties;
            properties = this.getProperties();
            return properties.name;
        },

        /**
         * Changes the name of this node. This operation deviates from the behaviour of the Rhino-ScriptNode API as it treats a name change
         * the same as any property change, and requires a subsequent call to 'save' or an operation with implicit 'save' behaviour to
         * actually persist the new name along with any other changed properties.
         * 
         * @instance
         * @param {string}
         *            name the new name of the node
         */
        setName : function alfresco_node_ScriptNode__setName(name)
        {
            var properties;
            properties = this.getProperties();
            properties.name = name;
        },

        /**
         * Sets the type of the node to a specialized sub-type. This operation implicitly persists any changed properties and synchronizes
         * the internal properties state if the specialization succeeds.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            type the sub-type for the node
         * @returns {boolean} true if the node was specialized, false otherwise
         */
        specializeType : function alfresco_node_ScriptNode__specializeType()
        {
            var specialized, properties;

            properties = this.getProperties();
            specialized = this.inherited(arguments);

            if (specialized)
            {
                properties.save();
            }

            return specialized;
        }
    });
});