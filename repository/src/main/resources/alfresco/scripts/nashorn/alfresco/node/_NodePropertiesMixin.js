/* globals -require */
define([ '_base/declare', '../common/QNameMapWrapper', '../foundation/NodeService', '_base/logger', 'nashorn!Java' ],
        function alfresco_node_NodePropertiesMixin_root(declare, QNameMapWrapper, NodeService, logger, Java)
        {
            'use strict';

            var NodeRef;

            NodeRef = Java.type('org.alfresco.service.cmr.repository.NodeRef');

            return declare([], {

                '--declare--proxy-support-enabled' : true,

                '--declare--proxy-getter-redirection-enabled' : true,

                getProperties : function alfresco_node_NodePropertiesMixin__getProperties()
                {
                    // TODO Switch from trivial to somewhat statefull impl
                    var result, properties;

                    if (this.nodeRef instanceof NodeRef)
                    {
                        properties = NodeService.getProperties(this.nodeRef);
                        result = new QNameMapWrapper(properties);
                    }

                    return result;
                },

                save : function alfresco_node_NodePropertiesMixin__save()
                {
                    // TODO implement
                }
            });
        });