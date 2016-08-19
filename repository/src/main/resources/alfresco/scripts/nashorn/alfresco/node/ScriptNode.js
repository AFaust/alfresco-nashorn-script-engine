/* globals -require */
/**
 * This module provides the same abstraction over nodes in the Alfresco repository as the Rhino-based class ScriptNode does. For the most
 * part the API of this module should behave exactly as the Rhino-ScriptNode API does while explicit deviations from this rule are
 * documented on the affected operations.
 * 
 * @module alfresco/node/ScriptNode
 * @extends module:_base/JavaConvertableMixin
 * @mixes module:alfresco/node/_NodeIdentityMixin
 * @mixes module:alfresco/node/_NodeTypesAndAspectsMixin
 * @mixes module:alfresco/node/_NodePropertiesMixin
 * @mixes module:alfresco/node/_NodeHierarchyMixin
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:_base/lang
 * @author Axel Faust
 */
define([ '_base/declare', '_base/JavaConvertableMixin', './_NodeIdentityMixin', './_NodeTypesAndAspectsMixin', './_NodePropertiesMixin',
        './_NodeHierarchyMixin', '_base/ProxySupport', '_base/lang' ], function alfresco_node_ScriptNode__root(declare,
        JavaConvertableMixin, _NodeIdentityMixin, _NodeTypesAndAspectsMixin, _NodePropertiesMixin, _NodeHierarchyMixin, ProxySupport, lang)
{
    'use strict';
    return declare([ JavaConvertableMixin, _NodeIdentityMixin, _NodeTypesAndAspectsMixin, _NodePropertiesMixin, _NodeHierarchyMixin,
            ProxySupport ], {

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
         * Sets the type of the node to a specialized sub-type. This operation implicitly discards any changed properties and synchronizes
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
            specialized = this.inherited(alfresco_node_ScriptNode__specializeType, arguments);

            if (specialized)
            {
                this.resetPropertyCaches();
            }

            return specialized;
        },

        /**
         * Applies an aspect to the node, optionally adding relevant aspect properties too. This operation implicitly discards any changed
         * properties and synchronizes the internal properties state if the aspect application succeeds or custom properties are set via
         * this operation.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            aspect the aspect to apply
         * @param {object}
         *            properties the properties to add to the node with this operation
         * @returns {boolean} true if a new aspect was added, false otherwise i.e. if the aspect was already applied
         */
        addAspect : function alfresco_node_ScriptNode__addAspect()
        {
            var aspectApplied;

            aspectApplied = this.inherited(alfresco_node_ScriptNode__addAspect, arguments);

            if (aspectApplied || (lang.isObject(arguments[1], null, true) && Object.keys(arguments[1]).length > 0))
            {
                this.resetPropertyCaches();
            }

            return aspectApplied;
        },

        /**
         * Removes an aspect from the node. This operation implicitly discards any changed properties and synchronizes the internal
         * properties state if the aspect removal succeeds.
         * 
         * @instance
         * @param {string|QName|module:alfresco/common/QName}
         *            aspect the aspect to remove
         * @returns {boolean} true if an aspect was removed, false otherwise i.e. if the aspect was not previously applied or wasn't
         *          effectively removed (i.e. due to being a mandatory aspect)
         */
        removeAspect : function alfresco_node_ScriptNode__removeAspect()
        {
            var aspectRemoved;

            aspectRemoved = this.inherited(alfresco_node_ScriptNode__removeAspect, arguments);

            if (aspectRemoved)
            {
                this.resetPropertyCaches();
            }

            return aspectRemoved;
        }
    });
});