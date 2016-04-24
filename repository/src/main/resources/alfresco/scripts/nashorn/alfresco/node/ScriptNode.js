/* globals -require */
/**
 * This module provides the same abstraction over nodes in the Alfresco repository as the Rhino-based class ScriptNode does. For the most
 * part the API of this module should behave exactly as the Rhino-ScriptNode API does while explicit deviations from this rule are
 * documented on the affected operations.
 * 
 * @module alfresco/node/ScriptNode
 * @mixes module:_base/JavaConvertableMixin
 * @mixes module:alfresco/node/_NodeIdentityMixin
 * @mixes module:alfresco/node/_NodePropertiesMixin
 * @requires module:_base/declare
 * @author Axel Faust
 */
define([ '_base/declare', '_base/JavaConvertableMixin', './_NodeIdentityMixin', './_NodePropertiesMixin' ],
        function alfresco_node_ScriptNode_root(declare, JavaConvertableMixin, _NodeIdentityMixin, _NodePropertiesMixin)
        {
            'use strict';

            return declare([ JavaConvertableMixin, _NodeIdentityMixin, _NodePropertiesMixin ], {

                _internalJavaValueProperty : 'nodeRef',

                /**
                 * Retrieves the name of this node. This operation will consider and respect any non-committed/unsaved change to the name of
                 * the node either via {@link module:alfresco/node/ScriptNode~setName} or the map of properties.
                 * 
                 * @instance
                 * @function
                 * @returns {string} the name of the node
                 */
                getName : function alfresco_node_ScriptNode__getName()
                {
                    var properties;
                    properties = this.getProperties();
                    return properties.name;
                },

                /**
                 * Changes the name of this node. This operation deviates from the behaviour of the Rhino-ScriptNode API as it treats a name
                 * change the same as any property change, and requires a subsequent call to 'save' to actually persist the new name along
                 * with any other changed properties.
                 * 
                 * @instance
                 * @functoin
                 * @param {string}
                 *            name the new name of the node
                 */
                setName : function alfresco_node_ScriptNode__setName(name)
                {
                    var properties;
                    properties = this.getProperties();
                    properties.name = name;
                }
            });
        });