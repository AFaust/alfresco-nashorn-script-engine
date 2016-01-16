/*
 * Copyright 2015 Axel Faust
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
package de.axelfaust.alfresco.nashorn.repo.processor;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * @author Axel Faust
 */
public abstract class NashornUtils
{

    private NashornUtils()
    {
        // NO-OP
    }

    /**
     * Retrieves the script URL of the caller in the Nashorn script engine environment of the current thread.
     *
     * @return the script URL of the caller
     */
    public static String getCallerScriptURL()
    {
        return getCallerScriptURL(false, false);
    }

    /**
     * Retrieves the script URL of the caller in the Nashorn script engine environment of the current thread.
     *
     * @param excludeTopFrame
     *            {@code true} if the top script caller should be excluded, i.e. if a script function itself needs to determine its caller
     * @param excludeAllFromTopFrameScript
     *            {@code true} if all frames from the top caller script should be excluded - only relevant if {@code excludeTopFrame} is set
     *            to {@code true}
     * @return the script URL of the caller
     */
    public static String getCallerScriptURL(final boolean excludeTopFrame, final boolean excludeAllFromTopFrameScript)
    {
        final StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
        StackTraceElement topJSFrame = null;
        String topFrameScript = null;

        boolean topFrameExcluded = false;
        for (final StackTraceElement frame : stackTrace)
        {
            final String className = frame.getClassName();
            final String methodName = frame.getMethodName();

            if (isNashornScript(className) && !isInternalMethodName(methodName))
            {
                final String fileName = frame.getFileName();
                if (excludeTopFrame == topFrameExcluded && !(excludeAllFromTopFrameScript && fileName.equals(topFrameScript)))
                {
                    topJSFrame = frame;
                    break;
                }
                topFrameExcluded = true;
                topFrameScript = fileName;
            }
        }

        return topJSFrame != null ? topJSFrame.getFileName() : null;
    }

    /**
     * Retrieves the script URL of the caller in the Nashorn script engine environment of the current thread.
     *
     * @param scriptsToExclude
     *            the collection of scripts to exclude/ignore when retrieving the caller script URL
     * @return the script URL of the caller
     */
    public static String getCallerScriptURL(final Collection<String> scriptsToExclude)
    {
        final StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
        StackTraceElement topJSFrame = null;

        for (final StackTraceElement frame : stackTrace)
        {
            final String className = frame.getClassName();
            final String fileName = frame.getFileName();
            final String methodName = frame.getMethodName();

            if (isNashornScript(className) && !scriptsToExclude.contains(fileName) && !isInternalMethodName(methodName))
            {
                topJSFrame = frame;
                break;
            }
        }

        return topJSFrame != null ? topJSFrame.getFileName() : null;
    }

    /**
     * Retrieves the script URL of the caller in the Nashorn script engine environment of the current thread.
     *
     * @param excludeTopFrameScriptsCount
     *            how many distinct caller scripts should be excluded
     * @param excludeAllFromTopFrameScripts
     *            {@code true} if all frames from the same top caller scripts should be excluded - only relevant if {@code excludeTopFrame}
     *            is set to {@code true}
     * @return the script URL of the caller
     */
    public static String getCallerScriptURL(final int excludeTopFrameScriptsCount, final boolean excludeAllFromTopFrameScripts)
    {
        final StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
        StackTraceElement topJSFrame = null;

        final Set<String> excludedTopFrameScripts = new HashSet<String>();

        for (final StackTraceElement frame : stackTrace)
        {
            final String className = frame.getClassName();
            final String methodName = frame.getMethodName();

            if (isNashornScript(className) && !isInternalMethodName(methodName))
            {
                final String fileName = frame.getFileName();
                if (excludedTopFrameScripts.contains(fileName) && excludeAllFromTopFrameScripts)
                {
                    continue;
                }

                if (!excludedTopFrameScripts.contains(fileName) && excludedTopFrameScripts.size() < excludeTopFrameScriptsCount)
                {
                    excludedTopFrameScripts.add(fileName);
                    continue;
                }

                topJSFrame = frame;
                break;
            }
        }

        return topJSFrame != null ? topJSFrame.getFileName() : null;
    }

    private static boolean isNashornScript(final String className)
    {
        // there is apparently no other way then to check for Nashorn-internal class name
        // unfortunately, this can be broken by any changes in Nashorn
        return className.startsWith("jdk.nashorn.internal.scripts.Script$");
    }

    private static boolean isInternalMethodName(final String methodName)
    {
        // unfortunately, this can be broken by any changes in Nashorn
        return methodName.startsWith(":") && !methodName.equals(":program");
    }
}
