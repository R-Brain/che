/*******************************************************************************
 * Copyright (c) 2012-2017 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 *******************************************************************************/
package org.eclipse.che.ide.commons.exception;

import org.eclipse.che.ide.rest.AsyncRequest;

/** @author <a href="mailto:gavrikvetal@gmail.com">Vitaliy Gulyy</a> */

@SuppressWarnings("serial")
public class ServerDisconnectedException extends Exception {

    private AsyncRequest asyncRequest;

    public ServerDisconnectedException(AsyncRequest asyncRequest) {
        this.asyncRequest = asyncRequest;
    }

    public AsyncRequest getAsyncRequest() {
        return asyncRequest;
    }
}
