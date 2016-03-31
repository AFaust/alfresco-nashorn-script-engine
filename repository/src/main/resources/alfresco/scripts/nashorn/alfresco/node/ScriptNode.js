/* globals -require */
define([ '_base/declare', '_base/JavaConvertableMixin', './_NodeIdentityMixin', './_NodePropertiesMixin' ],
        function alfresco_node_ScriptNode_root(declare, JavaConvertableMixin, _NodeIdentityMixin, _NodePropertiesMixin)
        {
            'use strict';

            return declare([ JavaConvertableMixin, _NodeIdentityMixin, _NodePropertiesMixin ], {

                _internalJavaValueProperty : 'nodeRef'

            });
        });