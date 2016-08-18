/* globals -require */
/**
 * This mixin module provides the ability to handle properties of a live node in the Alfresco repository.
 * 
 * @module alfresco/node/_NodePropertiesMixin
 * @extends module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/node/NodePropertiesMap
 * @requires module:_base/logger
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', './NodePropertiesMap', '_base/logger' ], function alfresco_node_NodePropertiesMixin__root(
        declare, ProxySupport, NodePropertiesMap, logger)
{
    'use strict';
    return declare([ ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        getProperties : function alfresco_node_NodePropertiesMixin__getProperties()
        {
            var result, properties;

            if (!this.hasOwnProperty('properties'))
            {
                logger.debug('Initialising properties of {}', this.nodeRef);
                properties = new NodePropertiesMap(this.nodeRef);
                Object.defineProperty(this, 'properties', {
                    value : properties,
                    enumerable : true
                });

                result = properties;
            }

            return result;
        },

        // we don't provide a getPropertyNames(boolean) as that would be redundant to key iteration on result of getProperties

        /**
         * This function provides save handling for a node, ensuring that all changed data will be persisted and next calls to operations
         * are guaranteed to reflect the current node state. Overrides of this function must always make sure to call inherited().
         */
        save : function alfresco_node_NodePropertiesMixin__save()
        {
            this.inherited(alfresco_node_NodePropertiesMixin__save, arguments);

            if (this.hasOwnProperty('properties'))
            {
                logger.debug('Saving properties of {}', this.nodeRef);
                this.properties.save();
            }
        },

        /**
         * This function provides reset handling of a node, ensuring that all changed data will be discarded and next calls to operations
         * are guaranteed to reflect the current node state. Overrides of this function must always make sure to call inherited().
         */
        reset : function alfresco_node_NodePropertiesMixin__reset()
        {
            this.inherited(alfresco_node_NodePropertiesMixin__reset, arguments);
            this.resetPropertyCaches();
        },

        /**
         * This function provides a specific hook for other modules to call to reset only cached data regarding node properties when other
         * operations may have changed the specific node state.
         */
        resetPropertyCaches : function alfresco_node_NodePropertiesMixin__resetPropertyCaches()
        {
            // reset cached values (that may have been changed externally)
            if (this.hasOwnProperty('properties'))
            {
                logger.debug('Resetting properties of {}', this.nodeRef);
                this.properties.reset();
            }
        }
    });
});