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
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;

import org.alfresco.util.ParameterCheck;

/**
 * @author Axel Faust
 */
public class ByteBufferInputStream extends InputStream
{

    protected final ByteBuffer buffer;

    protected int position = 0;

    public ByteBufferInputStream(final ByteBuffer buffer)
    {
        ParameterCheck.mandatory("buffer", buffer);
        this.buffer = buffer;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public int read() throws IOException
    {
        final int read = this.position < this.buffer.limit() ? this.buffer.get(this.position++) : -1;
        return read;
    }

}
