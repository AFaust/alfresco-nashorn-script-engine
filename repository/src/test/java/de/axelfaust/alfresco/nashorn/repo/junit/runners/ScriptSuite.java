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
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;

import org.junit.runner.Runner;
import org.junit.runners.Suite;
import org.junit.runners.model.InitializationError;

/**
 * @author Axel Faust
 */
public class ScriptSuite extends Suite
{

    /**
     * The <code>ScriptFiles</code> annotation specifies the script files to be run when a class annotated with
     * <code>@RunWith(ScriptSuite.class)</code> is run.
     */
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    @Inherited
    public @interface ScriptFiles
    {

        /**
         * @return the script files to be run
         */
        public String[] value();
    }

    /**
     * The <code>SuiteFolders</code> annotation specifies the script folder that contains the scripts to be run when a class annotated with
     * <code>@RunWith(ScriptSuite.class)</code> is run.
     */
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    @Inherited
    public @interface SuiteFolders
    {

        /**
         * @return the script folders
         */
        public String[] value();
    }

    protected static String[] listScriptFiles(final Class<?> klass) throws InitializationError
    {
        final Collection<String> scriptFiles = new LinkedHashSet<String>();

        final ScriptFiles scriptFilesAnnot = klass.getAnnotation(ScriptFiles.class);
        if (scriptFilesAnnot != null)
        {
            scriptFiles.addAll(Arrays.asList(scriptFilesAnnot.value()));
        }

        final SuiteFolders suiteFolders = klass.getAnnotation(SuiteFolders.class);
        if (suiteFolders != null)
        {
            try
            {
                for (final String suiteFolder : suiteFolders.value())
                {
                    final URL rootResource = ScriptSuite.class.getClassLoader().getResource("log4j.properties");
                    final Path rootPath = Paths.get(rootResource.toURI()).getParent();
                    final Path path = rootPath.resolve(suiteFolder.startsWith("/") ? suiteFolder.substring(1) : suiteFolder);

                    try (DirectoryStream<Path> ds = Files.newDirectoryStream(path, x -> (x.toFile().getName().endsWith(".js") || x.toFile()
                            .getName().endsWith(".nashornjs"))))
                    {
                        ds.forEach(x -> scriptFiles.add("/" + rootPath.relativize(x).toString().replace('\\', '/')));
                    }
                }
            }
            catch (URISyntaxException | IOException ex)
            {
                throw new InitializationError(ex);
            }
        }

        final String[] scriptFilesArr = scriptFiles.toArray(new String[0]);
        return scriptFilesArr;
    }

    protected static List<Runner> buildRunners(final String[] scriptFiles) throws InitializationError
    {
        final List<Runner> runners = new ArrayList<Runner>();
        for (final String scriptFile : scriptFiles)
        {
            runners.add(new ScriptFile(scriptFile));
        }
        return runners;
    }

    public ScriptSuite(final Class<?> klass) throws InitializationError
    {
        this(klass, listScriptFiles(klass));
    }

    protected ScriptSuite(final Class<?> klass, final String[] suiteScriptFiles) throws InitializationError
    {
        super(klass, buildRunners(suiteScriptFiles));
    }
}
