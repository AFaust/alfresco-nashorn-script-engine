/**
 * This module provides the functionality to create class-like constructs using multiple inheritance and support of calling "inherited"
 * functions from base classes in a defined resolution order.
 * 
 * @module _base/declare
 * @requires module:_base/c3mro
 * @requires module:_base/logger
 * @author Axel Faust
 */
/* globals -require */
define(
        [ './c3mro', 'require', 'define', './logger' ],
        function declare_root(c3mro, require, define, logger)
        {
            'use strict';
            var anonClassCount = 0, FnCtor, DummyCtor, isObject, fn_toString, isInstanceOf, inherited, forceNew, applyNew, createStandardConstructor, standardConstructorImpl, taggedMixin, standardPrototype, declareImpl, declare;

            FnCtor = Function;

            DummyCtor = new FnCtor();

            isObject = function declare__isObject(o)
            {
                var result = o instanceof Object && Object.prototype.toString.call(o) === '[object Object]';
                return result;
            };

            fn_toString = function declare__fn_toString(defaultToString)
            {
                var result, className, fnName;

                if (defaultToString === true)
                {
                    result = Function.prototype.toString.call(this);
                }
                else
                {
                    if (this._declare_meta !== undefined)
                    {
                        className = this._declare_meta.className;
                    }
                    else
                    {
                        className = this.fnClsName;
                    }
                    fnName = this.fnName;

                    result = '[Function ' + className + '_' + fnName + ']';
                }

                return result;
            };

            /**
             * Checks if this instance is an instance of a specific class considering single inheritance as well as the multi-inheritance
             * constructs this module supports. This method will be included in the prototype of any class created via [declare]{@link module:_base/declare#declare}
             * 
             * @public
             * @function
             * @param {function}
             *            cls - the class against which to check this instance
             * @returns boolean true if this instance is an instanceof of the specified class
             */
            isInstanceOf = function declare__isInstanceOf(cls)
            {
                var linearization = this.constructor._c3mro_linearization, isBase = false, idx;

                logger.trace('Checking linearized classes of {} for containment of {}', this.constructor.fnClsName, cls);

                for (idx = 0; idx < linearization.length && isBase === false; idx++)
                {
                    isBase = linearization[idx] === cls;
                }

                logger.trace(
                        isBase ? 'Found {} in linearized classes of {} at position {}' : 'Did not find {} in linearized classes of {}',
                        cls, this.constructor.fnClsName, idx);

                return isBase;
            };

            /**
             * Calls a specific function inherited from a base class using the next base class in the linearization of base classes relative
             * to the function passed as the currently executed function. This method will be included in the prototype of any class created
             * via [declare]{@link module:_base/declare#declare}
             * 
             * @public
             * @function
             * @param {function|string}
             *            fn - the identity handle or name of the function calling inherited (name should only be passed from the most
             *            specialized function of an inheritance chain
             * @param {object}
             *            arguments - the arguments to the function call
             */
            inherited = function declare__inherited()
            {
                var result, fnName, fnClsName, callerFn, args, overrides, effectiveArgs, idx, lastLookup, ctor, proto, fn, clsFound;

                // due to 'use strict' we can't use args.callee and have to require named function reference being passed
                logger.trace('inherited() called - analyzing arguments');

                for (idx = 0; idx < arguments.length; idx++)
                {
                    if (idx === 0 && typeof arguments[idx] === 'string')
                    {
                        fnName = arguments[idx];
                        if (this.constructor._declare_meta !== undefined)
                        {
                            fnClsName = this.constructor._declare_meta.className;
                        }
                        else
                        {
                            fnClsName = this.constructor.fnClsName;
                        }
                    }
                    else if (idx === 0 && typeof arguments[idx] === 'function')
                    {
                        callerFn = arguments[idx];
                        if (typeof callerFn.fnName === 'string')
                        {
                            fnName = callerFn.fnName;
                            fnClsName = callerFn.fnClsName;
                        }
                    }
                    else if (idx < 2 && args === undefined)
                    {
                        args = arguments[idx];
                    }
                    else if (idx > 1 && args !== undefined && overrides === undefined && Array.isArray(arguments[idx]))
                    {
                        overrides = arguments[idx];
                    }
                }

                logger.trace('Determined inherited() context as fn {} from class {}', fnName, fnClsName);

                if (fnName === undefined)
                {
                    throw new Error('Unable to determine function name to call for inherited()');
                }

                if (fnName !== 'constructor')
                {
                    if (overrides !== undefined)
                    {
                        for (idx = 0; idx < args.length || idx < overrides.length; idx++)
                        {
                            if (idx < overrides.length)
                            {
                                effectiveArgs.push(overrides[idx]);
                            }
                            else
                            {
                                effectiveArgs.push(args[idx]);
                            }
                        }
                    }
                    else
                    {
                        effectiveArgs = args;
                    }

                    if (this.hasOwnProperty('_inherited'))
                    {
                        lastLookup = this._inherited;
                    }
                    else
                    {
                        lastLookup = {
                            callerFnName : null,
                            callerFnClsName : null,
                            ctor : null
                        };

                        Object.defineProperty(this, '_inherited', {
                            value : lastLookup
                        });
                    }

                    if (lastLookup.callerFnName === fnName && lastLookup.callerFnClsName === fnClsName)
                    {
                        ctor = lastLookup.ctor;
                    }
                    else
                    {
                        ctor = this.constructor;
                    }
                    proto = ctor !== null ? ctor.prototype : null;

                    logger.trace('Looking for {} to call in linearized classes starting from {}', fnName, fnClsName);
                    // ascend the proto chain
                    while (typeof fn !== 'function' && ctor !== null)
                    {
                        if (clsFound === true)
                        {
                            if (proto.hasOwnProperty(fnName) && typeof proto[fnName] === 'function')
                            {
                                fn = proto[fnName];
                            }
                        }
                        else
                        {
                            clsFound = ctor.fnClsName === fnClsName;
                            if (clsFound === true)
                            {
                                logger.trace('Found caller class in linearized classes');
                            }
                        }

                        if (typeof fn !== 'function')
                        {
                            if (typeof ctor.superClass === 'function')
                            {
                                logger.trace('Stepping into super-class {} for class {}', ctor.superClass.fnClsName, ctor.fnClsName);
                                ctor = ctor.superClass;
                                proto = ctor.prototype;
                            }
                            else
                            {
                                logger.trace('Class {} has no super-class', ctor.fnClsName);
                                ctor = null;
                            }
                        }
                        else
                        {
                            logger.trace('Found function {} in super-class {}', fnName, ctor.fnClsName);
                        }
                    }

                    lastLookup.callerFnName = fnName;
                    lastLookup.callerFnClsName = fnClsName;
                    lastLookup.ctor = ctor;

                    if (typeof fn === 'function')
                    {
                        logger.debug('Delegating inherited() for {} to {} of super-class {}', fnName, fn, ctor);
                        result = fn.apply(this, effectiveArgs);
                    }
                    else
                    {
                        logger.debug('No function found for {} in linearized classes starting from {}', fnName, fnClsName);
                    }
                }
                else
                {
                    throw new Error('constructor is inheritently chained - call to inherited() is invalid');
                }

                return result;
            };

            forceNew = function declare__forceNew(ctor)
            {
                var instance;

                logger.trace('Forcing new instance of {}', ctor.fnClsName || ctor.name);

                DummyCtor.prototype = ctor.prototype;
                instance = new DummyCtor();
                DummyCtor.prototype = null;

                return instance;
            };

            applyNew = function declare__applyNew(args, ctor)
            {
                var instance = forceNew(ctor), altInstance;

                logger.trace('Applying constructor {} to new instance {}', ctor.fnClsName || ctor.name, instance);

                // allow ctor to provide an "actual" instance
                // support of potential "parasitic inheritance" pattern
                altInstance = ctor.apply(instance, args);

                if (altInstance !== undefined && altInstance !== null)
                {
                    logger.trace('Application of constructor {} yielded an alternative instance', ctor.fnClsName || ctor.name);
                    instance = altInstance;
                }

                return instance;
            };

            standardConstructorImpl = function declare__standardConstructorImpl(standardCtor, args)
            {
                var result, idx, ctor, linearization, curAltResult, altResult;

                if (!(this instanceof standardCtor))
                {
                    result = applyNew(args, standardCtor);
                }
                else
                {
                    logger.trace('Calling constructors of linearized classes for {}', standardCtor.fnClsName || standardCtor.name);

                    linearization = standardCtor._c3mro_linearization;
                    result = this;

                    for (idx = linearization.length - 1; idx >= 0; idx--)
                    {
                        ctor = linearization[idx]._declare_meta.classConstructor;
                        if (typeof ctor === 'function')
                        {
                            logger.trace('Calling constructor from {} in linearized classes for {}', linearization[idx].fnClsName
                                    || linearization[idx].name, standardCtor.fnClsName || standardCtor.name);
                            altResult = ctor.apply(result, args);
                            if (altResult !== undefined && altResult !== null)
                            {
                                logger.trace('Application of constructor from {} yielded an alternative instance',
                                        linearization[idx].fnClsName || linearization[idx].name);
                            }
                            curAltResult = altResult || curAltResult;
                        }
                    }

                    // class name is included in a non-enumerable field to avoid messing with potential JSON.stringify use
                    Object.defineProperty(result, '_declare_className', {
                        value : standardCtor._declare_meta.className
                    });

                    if (curAltResult !== undefined && curAltResult !== null)
                    {
                        result = curAltResult;
                    }
                }

                return result;
            };

            createStandardConstructor = function declare__createStandardConstructor()
            {
                // we need a separate standardConstructor instance for every class due to inidividual prototype
                // fn should be as thin as possible - oursourcing most logic to common code in standardConstructorImpl
                var standardCtor = function declare__standardConstructor()
                {
                    var result = standardConstructorImpl.call(this, standardCtor, arguments);
                    return result;
                };

                return standardCtor;
            };

            taggedMixin = function declare__taggedMixin(target, source)
            {
                var name, value;

                if (logger.isTraceEnabled())
                {
                    logger.trace('Mixing properties {} into prototype of {}', Object.getOwnPropertyNames(source),
                            target.constructor._declare_meta !== undefined ? target.constructor._declare_meta.className
                                    : target.constructor.fnClsName || target.constructor.name);
                }

                for (name in source)
                {
                    if (source.hasOwnProperty(name) && name !== 'constructor')
                    {
                        value = source[name];
                        if (typeof value === 'function')
                        {
                            value.fnName = name;
                            value.toString = fn_toString;

                            if (target.constructor._declare_meta !== undefined)
                            {
                                value.fnClsName = target.constructor._declare_meta.className;
                            }
                        }
                        target[name] = value;
                    }
                }
            };

            standardPrototype = function declare__standardPrototype(cls, classStructure)
            {
                var superClass, proto, ctor, superLin, slLen, clsLin, clLen, startWithSuperClass = true, base, offset, name;

                superClass = cls._declare_meta.superClass;

                if (superClass !== null)
                {
                    // Check if expected superClass (first in superClass arg to declare) matches linearization tail
                    // If yes, use superClass for initial proto and mixin proto properties of all cls in linearization from superClass
                    // to 1
                    // If no, construct completely new chain of protos based on linearization

                    clsLin = cls._c3mro_linearization;
                    clLen = clsLin.length;

                    superLin = superClass._c3mro_linearization;
                    slLen = superLin.length;

                    for (offset = 1; offset <= slLen; offset++)
                    {
                        if (superLin[slLen - offset] !== clsLin[clLen - offset])
                        {
                            startWithSuperClass = false;
                        }
                    }

                    if (startWithSuperClass === false)
                    {
                        // can't use superClass as start, so reset offset and select differnt superClass to start proto from
                        superClass = clsLin[clLen - 1];
                        offset = 2;
                    }

                    while (offset < clLen)
                    {
                        proto = forceNew(superClass);

                        base = clsLin[clLen - offset];

                        if (logger.isTraceEnabled())
                        {
                            logger.trace('Mixing prototype properties {} from {} into new prototype chain of {}', Object
                                    .getOwnPropertyNames(base.prototype), base.fnClsName || base.name, cls._declare_meta.className);
                        }

                        for (name in base.prototype)
                        {
                            if (base.prototype.hasOwnProperty(name))
                            {
                                if (name !== 'constructor')
                                {
                                    proto[name] = base.prototype[name];
                                }
                            }
                        }

                        ctor = new FnCtor();
                        ctor.superClass = superClass;
                        ctor.prototype = proto;
                        ctor.fnClsName = base._declare_meta.className + '-derived';
                        ctor.fnName = 'constructor';
                        ctor.toString = fn_toString;
                        proto.constructor = ctor;

                        Object.freeze(ctor);

                        superClass = ctor;

                        offset += 1;
                    }

                    // last base => our (empty) proto
                    proto = forceNew(superClass);
                }
                else
                {
                    logger.trace('Starting with empty prototype for {}', cls._declare_meta.className);
                    proto = {
                        toString : function declare_class__defaultToString()
                        {
                            var className, toString;

                            className = this.constructor._declare_meta.className;
                            toString = '[object ' + className + ']';

                            return toString;
                        }
                    };
                }

                cls.prototype = proto;
                proto.constructor = cls;
                proto.declaredClass = cls._declare_meta.className;
                cls.superClass = superClass || null;
                cls.fnClsName = cls._declare_meta.className;
                cls.fnName = 'constructor';

                taggedMixin(proto, classStructure);

                return proto;
            };

            declareImpl = function declare__declareImpl(className, superClass, bases, classStructure)
            {
                var ctor, proto, meta, structure;

                logger.debug('Declaring class {} wit super-class {} and {} additional bases', className, superClass !== undefined
                        && superClass !== null ? superClass.fnClsName || superClass.name : 'n/a', bases.length);

                ctor = createStandardConstructor();

                // flip bases into order "right most mixin -> left most mixin -> superClass"
                // ensures linearization results in correct override order for mixins over base class
                bases.reverse();
                logger.trace('Performing c3mro linearization for {}', className);
                c3mro(ctor, bases);
                // flip back for documentation in meta
                bases.reverse();

                structure = {};

                Object.keys(classStructure).forEach(function declare__declareImpl_forEach_classStructure(key)
                {
                    if (key !== 'constructor')
                    {
                        structure[key] = classStructure[key];
                    }
                });

                meta = {
                    className : className,
                    superClass : superClass || null,
                    classConstructor : classStructure.classConstructor || null,
                    structure : structure,
                    bases : bases
                };

                if (logger.isTraceEnabled())
                {
                    logger.trace('Meta for {} is {}, custom constructor provided: {}, class structure provided: {}', className, JSON
                            .stringify(meta), typeof classStructure.classConstructor === 'function', Object
                            .getOwnPropertyNames(classStructure));
                }

                Object.defineProperty(ctor, '_declare_meta', {
                    value : meta
                });
                ctor.toString = fn_toString;

                logger.debug('Setting up prototype for {}', className);
                proto = standardPrototype(ctor, classStructure);

                // MAYBE Add special functions (extend / createSubclass) to ctor (if we need to support them)

                // TODO instead of mixing in these fns, create a transparent base class to inherit them from
                proto.isInstanceOf = isInstanceOf;
                proto.inherited = inherited;
                // TODO Add 'standard' methods to proto

                Object.freeze(meta);
                Object.freeze(bases);
                Object.freeze(structure);

                logger.debug('Completed declaration of {}', className);

                return ctor;
            };

            /**
             * Creates a new class from a defined class structure and optional base classes. This function is the identity of
             * [_base/declare]{@link module:_base/declare}.
             * 
             * @public
             * @function
             * @param {string}
             *            [name] - the name of the new class-like construct
             * @param {array}
             *            [bases] - the list of base classes from which the new class should inherit
             * @param {object}
             *            structure - the "body" of the new class definining its properties and functions
             */
            // callerUrl provided via 'callerProvided' flag in special module handling
            declare = function declare__declare(callerUrl)
            {
                var args, className, bases, superClass, structure;

                args = Array.prototype.slice.call(arguments, 1);

                args.forEach(function declare__declare_forEachArg(value, idx)
                {
                    if (idx === 0 && typeof value === 'string')
                    {
                        className = value;
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && typeof value === 'function')
                    {
                        bases = [ value ];
                    }

                    if (idx < 2 && bases === undefined && structure === undefined && Array.isArray(value))
                    {
                        bases = [];
                        value.forEach(function declare__declare_forEachArg_forEachBaseClass(fn)
                        {
                            if (typeof fn !== 'function')
                            {
                                throw new Error('Base ' + fn + ' is not a callable constructor');
                            }

                            if (!isObject(fn._declare_meta) || typeof fn._declare_meta.className !== 'string')
                            {
                                throw new Error('Base ' + fn + ' appears not to have been defined via declare');
                            }

                            bases.push(fn);
                        });
                    }

                    if (idx < 3 && structure === undefined && isObject(value))
                    {
                        structure = value;
                    }
                });

                if (structure === undefined || structure === null)
                {
                    structure = {};
                }

                if (bases === undefined)
                {
                    bases = [];
                }

                if (className === undefined || className === null)
                {
                    className = require.getScriptFileModuleId(callerUrl);
                    if (className === undefined || className === null)
                    {
                        className = 'anonClass_' + (++anonClassCount);
                    }
                }

                if (bases.length > 0)
                {
                    superClass = bases[0];
                }

                return declareImpl(className, superClass, bases, structure);
            };

            Object.freeze(declare);

            return define.asSpecialModule(declare, [ 'callerProvided' ]);
        });