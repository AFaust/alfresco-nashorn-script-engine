/* globals -require */
define([ '_base/declare', '_base/JavaConvertableMixin', '_base/ProxySupport', '../foundation/NamespaceService', '_base/logger',
        'nashorn!Java' ], function alfresco_common_QName__root(declare, JavaConvertableMixin, ProxySupport, NamespaceService, logger, Java)
{
    'use strict';
    var QName, IllegalArgumentException, NashornScriptModel, Module, qnameCache;

    QName = Java.type('org.alfresco.service.namespace.QName');
    IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
    NashornScriptModel = Java.type('de.axelfaust.alfresco.nashorn.repo.processor.NashornScriptModel');

    qnameCache = NashornScriptModel.newAssociativeContainer();

    // we have to encapsulate QName as we can't Java.extend due to private constructor
    // normal Java interop + extension could have save lots of boilerplate
    Module = declare([ JavaConvertableMixin, ProxySupport ], {

        '--proxy-support-enabled' : true,

        '--proxy-getter-redirection-enabled' : true,

        '--proxy-virtual-getters-enabled' : true,

        _internalJavaValueProperty : 'qname',

        classConstructor : function alfresco_common_QName__contructor(qname)
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

            // this is intended to be our only apparent property
            // defined this way since we want to be immutable
            Object.defineProperty(this, 'qname', {
                value : internalQName,
                enumerable : true
            });
        },

        // due to potential case diferences (xy.qname / xy.qName) we provide this getter
        getQName : function alfresco_common_QName__getQName()
        {
            return this.qname;
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
                logger.debug('Defining prefixString on {}', this.qname);
                // just a cached value to avoid redundant toPrefixString execution
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
                logger.debug('Defining fullString on {}', this.qname);
                // just a cached value
                Object.defineProperty(this, 'fullString', {
                    value : String(this.qname)
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

    Module.valueOf = function alfresco_common_QName__valueOf(qname)
    {
        var result;

        logger.trace('valueOf called for {}', qname);

        if (qname instanceof QName)
        {
            result = qnameCache[qname];

            if (result === null)
            {
                result = new Module(qname);
                qnameCache[qname] = result;
                qnameCache[result.prefixString] = result;
            }
        }
        else
        {
            result = qnameCache[qname];

            if (result === null)
            {
                result = new Module(qname);
                qnameCache[qname] = result;
                qnameCache[result.qname] = result;
                qnameCache[result.prefixString] = result;
            }
        }

        logger.debug('valueOf for {} yielded {}', qname, result);

        return result;
    };

    Object.freeze(Module);
    Object.freeze(Module.valueOf);

    return Module;
});