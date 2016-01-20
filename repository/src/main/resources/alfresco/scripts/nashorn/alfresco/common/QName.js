/* globals -require */
define([ '_base/declare', '../foundation/NamespaceService', 'nashorn!Java' ], function alfresco_common_QName__root(declare,
        NamespaceService, Java)
{
    'use strict';
    var QName, IllegalArgumentException;

    QName = Java.type('org.alfresco.service.namespace.QName');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');

    // we have to encapsulate QName as we can't Java.extend due to private constructor
    // normal Java interop + extension could have save lots of boilerplate
    return declare([], {

        '--declare--enable-shorthand-properties' : true,

        constructor : function alfresco_common_QName__contructor(qname)
        {
            var internalQName;

            if (typeof qname === 'string')
            {
                internalQName = QName.resolveToQName(NamespaceService, qname);
            }
            else if (qname instanceof QName)
            {
                internalQName = qname;
            }
            else if (qname !== undefined && qname !== null)
            {
                internalQName = QName.resolveToQName(NamespaceService, String(qname));
            }

            if (internalQName === null)
            {
                throw new IllegalArgumentException('qname value invalid: ' + qname);
            }

            Object.defineProperty(this, 'qname', {
                value : internalQName,
                enumerable : true
            });
        },

        // could have been avoided with Java.extend
        getLocalName : function alfresco_common_QName__getLocalName()
        {
            return this.qname.localName;
        },

        // could have been avoided with Java.extend
        getNamespaceURI : function alfresco_common_QName__getNamespaceURI()
        {
            return this.qname.namespaceURI;
        },

        // could have been overriden via Java.extend
        getPrefixString : function alfresco_common_QName__getPrefixString()
        {
            if (this.prefixString === undefined)
            {
                Object.defineProperty(this, 'prefixString', {
                    value : this.qname.toPrefixString(NamespaceService),
                    enumerable : true
                });
            }
            return this.prefixString;
        },

        getFullString : function alfresco_common_QName__getPrefixString()
        {
            if (this.fullString === undefined)
            {
                Object.defineProperty(this, 'fullString', {
                    value : String(this.qname),
                    enumerable : true
                });
            }
            return this.fullString;
        },

        toString : function alfresco_common_QName__toString()
        {
            // in script the prefixString is preferred
            return this.getPrefixString();
        }

    });
});