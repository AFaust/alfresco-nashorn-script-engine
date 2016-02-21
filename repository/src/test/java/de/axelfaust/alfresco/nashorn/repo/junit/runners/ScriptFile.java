/*
 * Copyright 2016 Axel Faust
 *
 * Licensed under the Eclipse Public License (EPL), Version 1.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the License at
 *
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
package de.axelfaust.alfresco.nashorn.repo.junit.runners;

import java.io.IOException;
import java.io.Reader;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.script.SimpleScriptContext;

import jdk.nashorn.api.scripting.NashornScriptEngineFactory;
import jdk.nashorn.api.scripting.URLReader;
import junit.framework.TestCase;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.internal.runners.model.ReflectiveCallable;
import org.junit.internal.runners.rules.RuleFieldValidator;
import org.junit.internal.runners.statements.Fail;
import org.junit.internal.runners.statements.RunAfters;
import org.junit.internal.runners.statements.RunBefores;
import org.junit.rules.RunRules;
import org.junit.rules.TestRule;
import org.junit.runner.Description;
import org.junit.runner.notification.RunNotifier;
import org.junit.runners.ParentRunner;
import org.junit.runners.model.FrameworkMethod;
import org.junit.runners.model.InitializationError;
import org.junit.runners.model.Statement;

import de.axelfaust.alfresco.nashorn.repo.junit.interop.InvokeScriptFunction;
import de.axelfaust.alfresco.nashorn.repo.junit.interop.JUnitAfterAwareScript;
import de.axelfaust.alfresco.nashorn.repo.junit.interop.JUnitBeforeAwareScript;
import de.axelfaust.alfresco.nashorn.repo.junit.interop.JUnitTestCaseAwareScript;
import de.axelfaust.alfresco.nashorn.repo.junit.interop.JUnitTestScript;
import de.axelfaust.alfresco.nashorn.repo.junit.interop.ScriptFunction;
import de.axelfaust.alfresco.nashorn.repo.junit.tests.SimpleScriptTestCase;

/**
 * @author Axel Faust
 */
@SuppressWarnings("restriction")
public class ScriptFile extends ParentRunner<ScriptFunction>
{

    protected static final ScriptEngine NASHORN_ENGINE;
    static
    {
        final NashornScriptEngineFactory scriptEngineFactory = new NashornScriptEngineFactory();
        // -ot / -pcc / --class-cache-size should not be relevant for testing
        NASHORN_ENGINE = scriptEngineFactory.getScriptEngine("-scripting=false", "--const-as-var=true", "--debug-lines=true",
                "--debug-locals=true");
    }

    protected static Class<? extends TestCase> determineTestCaseClass(final String scriptFile) throws InitializationError
    {
        final Bindings bindings = NASHORN_ENGINE.createBindings();
        final SimpleScriptContext scriptContext = new SimpleScriptContext();
        scriptContext.setBindings(bindings, ScriptContext.GLOBAL_SCOPE);

        final URL resource = ScriptFile.class.getResource(scriptFile);
        if (resource == null)
        {
            throw new InitializationError(scriptFile + " cannot be found");
        }

        final Object testObj;
        try
        {
            testObj = executeScriptFromResource(resource, scriptFile, scriptContext);
        }
        catch (final ScriptException ex)
        {
            throw new InitializationError(ex);
        }

        final JUnitTestCaseAwareScript testCaseAwareScript = ((Invocable) NASHORN_ENGINE).getInterface(testObj,
                JUnitTestCaseAwareScript.class);
        final Class<? extends TestCase> testCaseClass = testCaseAwareScript != null ? testCaseAwareScript.getTestCaseClass()
                : SimpleScriptTestCase.class;

        return testCaseClass;
    }

    protected static Object executeScriptFromResource(final URL resource, final String shortName, final ScriptContext scriptContext)
            throws ScriptException
    {
        try (@SuppressWarnings("restriction")
        Reader reader = new URLReader(resource))
        {
            scriptContext.setAttribute(ScriptEngine.FILENAME, shortName, ScriptContext.ENGINE_SCOPE);
            return NASHORN_ENGINE.eval(reader, scriptContext);
        }
        catch (final IOException e)
        {
            throw new ScriptException(e);
        }
    }

    protected final String scriptFile;

    protected final Object scriptTestObject;

    protected ScriptFile(final String scriptFile) throws InitializationError
    {
        super(determineTestCaseClass(scriptFile));
        this.scriptFile = scriptFile;

        try
        {
            this.scriptTestObject = this.createScriptTest();
        }
        catch (final Exception ex)
        {
            throw new InitializationError(ex);
        }
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    protected String getName()
    {
        return this.scriptFile;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    protected List<ScriptFunction> getChildren()
    {
        final List<ScriptFunction> children = new ArrayList<ScriptFunction>();
        final JUnitTestScript testScript = ((Invocable) NASHORN_ENGINE).getInterface(this.scriptTestObject, JUnitTestScript.class);
        if (testScript != null)
        {
            final List<String> testFunctionNames = testScript.getTestFunctionNames();
            for (final String testFunctionName : testFunctionNames)
            {
                children.add(new ScriptFunction(testFunctionName));
            }
        }

        return children;
    }

    protected final ConcurrentHashMap<ScriptFunction, Description> functionDescriptions = new ConcurrentHashMap<ScriptFunction, Description>();

    @Override
    protected Description describeChild(final ScriptFunction function)
    {
        Description description = this.functionDescriptions.get(function);

        if (description == null)
        {
            description = Description.createTestDescription(this.scriptFile, function.getFunctionName());
            this.functionDescriptions.putIfAbsent(function, description);
        }

        return description;
    }

    @Override
    protected void runChild(final ScriptFunction scriptFunction, final RunNotifier notifier)
    {
        final Description description = this.describeChild(scriptFunction);
        this.runLeaf(this.methodBlock(scriptFunction), description, notifier);
    }

    // TODO classBlock with beforeClass/afterClass from script

    protected Statement methodBlock(final ScriptFunction scriptFunction)
    {
        Object test;
        Object scriptTest;
        try
        {
            test = new ReflectiveCallable()
            {

                @Override
                protected Object runReflectiveCall() throws Throwable
                {
                    return ScriptFile.this.createTest();
                }
            }.run();
            scriptTest = new ReflectiveCallable()
            {

                @Override
                protected Object runReflectiveCall() throws Throwable
                {
                    return ScriptFile.this.createScriptTest();
                }
            }.run();
        }
        catch (final Throwable e)
        {
            return new Fail(e);
        }

        Statement statement = new InvokeScriptFunction(scriptTest, scriptFunction, test);
        statement = this.withBefores(test, scriptTest, statement);
        statement = this.withAfters(test, scriptTest, statement);
        statement = this.withTestRules(scriptFunction, this.getTestRules(test), statement);
        return statement;
    }

    protected Statement withBefores(final Object target, final Object scriptTarget, final Statement statement)
    {
        final List<FrameworkMethod> befores = this.getTestClass().getAnnotatedMethods(Before.class);
        Statement resultStatement = befores.isEmpty() ? statement : new RunBefores(statement, befores, target);

        final JUnitBeforeAwareScript beforeAwareScript = ((Invocable) NASHORN_ENGINE).getInterface(scriptTarget,
                JUnitBeforeAwareScript.class);
        if (beforeAwareScript != null)
        {
            resultStatement = new InvokeScriptFunction(statement, false, scriptTarget, new ScriptFunction("before"), target);
        }

        return resultStatement;
    }

    protected Statement withAfters(final Object target, final Object scriptTarget, final Statement statement)
    {
        final List<FrameworkMethod> afters = this.getTestClass().getAnnotatedMethods(After.class);
        Statement resultStatement = afters.isEmpty() ? statement : new RunAfters(statement, afters, target);

        final JUnitAfterAwareScript beforeAwareScript = ((Invocable) NASHORN_ENGINE)
                .getInterface(scriptTarget, JUnitAfterAwareScript.class);
        if (beforeAwareScript != null)
        {
            resultStatement = new InvokeScriptFunction(statement, false, scriptTarget, new ScriptFunction("after"), target);
        }

        return resultStatement;
    }

    private Statement withTestRules(final ScriptFunction scriptFunction, final List<TestRule> testRules, final Statement statement)
    {
        return testRules.isEmpty() ? statement : new RunRules(statement, testRules, this.describeChild(scriptFunction));
    }

    protected List<TestRule> getTestRules(final Object target)
    {
        final List<TestRule> result = this.getTestClass().getAnnotatedMethodValues(target, Rule.class, TestRule.class);
        result.addAll(this.getTestClass().getAnnotatedFieldValues(target, Rule.class, TestRule.class));
        return result;
    }

    protected Object createTest() throws Exception
    {
        return this.getTestClass().getOnlyConstructor().newInstance();
    }

    protected Object createScriptTest() throws Exception
    {
        final Bindings bindings = NASHORN_ENGINE.createBindings();
        final SimpleScriptContext scriptContext = new SimpleScriptContext();
        scriptContext.setBindings(bindings, ScriptContext.GLOBAL_SCOPE);

        final URL resource = ScriptFile.class.getResource(this.scriptFile);
        final Object scriptTestObject = executeScriptFromResource(resource, this.scriptFile, scriptContext);
        return scriptTestObject;
    }

    /**
     *
     * {@inheritDoc}
     */
    @Override
    protected void collectInitializationErrors(final List<Throwable> errors)
    {
        super.collectInitializationErrors(errors);

        // copied from BlockJUnit4ClassRunner
        this.validateConstructor(errors);
        this.validateFields(errors);
        this.validateMethods(errors);
    }

    // copied from BlockJUnit4ClassRunner
    protected void validateConstructor(final List<Throwable> errors)
    {
        this.validateOnlyOneConstructor(errors);
        this.validateZeroArgConstructor(errors);
    }

    // copied from BlockJUnit4ClassRunner
    protected void validateOnlyOneConstructor(final List<Throwable> errors)
    {
        if (!this.hasOneConstructor())
        {
            final String gripe = "Test class should have exactly one public constructor";
            errors.add(new Exception(gripe));
        }
    }

    // copied from BlockJUnit4ClassRunner
    protected void validateZeroArgConstructor(final List<Throwable> errors)
    {
        if (!this.getTestClass().isANonStaticInnerClass() && this.hasOneConstructor()
                && (this.getTestClass().getOnlyConstructor().getParameterTypes().length != 0))
        {
            final String gripe = "Test class should have exactly one public zero-argument constructor";
            errors.add(new Exception(gripe));
        }
    }

    // copied from BlockJUnit4ClassRunner
    protected boolean hasOneConstructor()
    {
        return this.getTestClass().getJavaClass().getConstructors().length == 1;
    }

    // copied from BlockJUnit4ClassRunner
    protected void validateFields(final List<Throwable> errors)
    {
        RuleFieldValidator.RULE_VALIDATOR.validate(this.getTestClass(), errors);
    }

    // copied from BlockJUnit4ClassRunner
    protected void validateMethods(final List<Throwable> errors)
    {
        RuleFieldValidator.RULE_METHOD_VALIDATOR.validate(this.getTestClass(), errors);
    }
}
