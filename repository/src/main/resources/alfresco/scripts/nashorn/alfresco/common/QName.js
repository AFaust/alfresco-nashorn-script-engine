/* globals _executionKey: false */
/* globals -require */
define([ '_base/declare', '_base/JavaConvertableMixin', '../foundation/NamespaceService', '_base/logger', 'nashorn!Java' ],
        function alfresco_common_QName__root(declare, JavaConvertableMixin, NamespaceService, logger, Java)
        {
            'use strict';
            var QName, IllegalArgumentException, HashMap, WeakHashMap, Module, qnameCache;

            QName = Java.type('org.alfresco.service.namespace.QName');
            IllegalArgumentException = Java.type('java.lang.IllegalArgumentException');
            HashMap = Java.type('java.util.HashMap');
            WeakHashMap = Java.type('java.util.WeakHashMap');

            qnameCache = new WeakHashMap();

            // we have to encapsulate QName as we can't Java.extend due to private constructor
            // normal Java interop + extension could have save lots of boilerplate
            Module = declare([ JavaConvertableMixin ], {

                '--declare--enable-shorthand-properties-getters' : true,
                // just for documentation sake
                '--declare--enable-shorthand-properties-setters' : false,

                '--declare--enable-properties-getter-simulation' : true,

                internalJavaValueProperty : 'qname',

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
                var result, cache;

                cache = qnameCache.get(_executionKey);
                if (cache === null)
                {
                    cache = new HashMap();
                    qnameCache.put(_executionKey, cache);
                }

                if (qname instanceof QName)
                {
                    result = cache.get(qname);

                    if (result === null)
                    {
                        result = cache.get(String(qname));
                    }

                    if (result === null)
                    {
                        result = new Module(qname);
                        cache.put(qname, result);
                        cache.put(String(qname), result);
                    }
                }
                else
                {
                    result = cache.get(qname);

                    if (result === null)
                    {
                        result = new Module(qname);
                        cache.put(qname, result);
                        cache.put(result.qname, result);
                        cache.put(String(result.qname), result);
                    }
                }
                
                return result;
            };

            Object.freeze(Module);
            Object.freeze(Module.valueOf);

            return Module;
        });