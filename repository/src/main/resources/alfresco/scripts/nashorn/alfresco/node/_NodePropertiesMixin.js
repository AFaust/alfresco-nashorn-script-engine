/* globals -require */
/**
 * This mixin module provides the ability to handle properties of a live node in the Alfresco repository.
 * 
 * @module alfresco/node/_NodePropertiesMixin
 * @mixes module:_base/ProxySupport
 * @requires module:_base/declare
 * @requires module:alfresco/node/NodePropertiesMap
 * @requires module:_base/logger
 * @requires module:nashorn!Java
 * @author Axel Faust
 */
define([ '_base/declare', '_base/ProxySupport', './NodePropertiesMap', '_base/logger', 'nashorn!Java' ],
        function alfresco_node_NodePropertiesMixin_root(declare, ProxySupport, NodePropertiesMap, logger, Java)
        {
            'use strict';

            var NodeRef;

            NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');

            return declare([ ProxySupport ], {

                '--proxy-support-enabled' : true,

                '--proxy-getter-redirection-enabled' : true,

                getProperties : function alfresco_node_NodePropertiesMixin__getProperties()
                {
                    var result, properties;

                    if (!this.hasOwnProperty('properties') && this.nodeRef instanceof NodeRef)
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

                save : function alfresco_node_NodePropertiesMixin__save()
                {
                    this.inherited(arguments);
                    if (this.hasOwnProperty('properties'))
                    {
                        logger.debug('Saving properties of {}', this.nodeRef);
                        this.properties.save();
                    }
                },

                reset : function alfresco_node_NodePropertiesMixin__reset()
                {
                    this.inherited(arguments);
                    if (this.hasOwnProperty('properties'))
                    {
                        logger.debug('Resetting properties of {}', this.nodeRef);
                        this.properties.reset();
                    }
                }
            });
        });