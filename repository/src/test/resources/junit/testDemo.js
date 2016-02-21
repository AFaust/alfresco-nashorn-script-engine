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

(function testDemo()
{
    var testObj = {
        getTestFunctionNames : function testDemo_getTestFunctionNames()
        {
            return Java.to([ 'successfulTest', 'failingTest' ], 'java.util.List');
        },

        successfulTest : function testDemo_sucessfulTest(testCase)
        {
            print('Successful test');
        },

        failingTest : function testDemo_failingTest(testCase)
        {
            // TODO Support optional hook to check if an error is expected for a test case
            throw new Error('This fails');
        }
    };
    return testObj;
}());