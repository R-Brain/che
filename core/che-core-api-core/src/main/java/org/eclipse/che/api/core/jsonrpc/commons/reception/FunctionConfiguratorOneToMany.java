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
package org.eclipse.che.api.core.jsonrpc.commons.reception;

import org.eclipse.che.api.core.jsonrpc.commons.RequestHandlerManager;
import org.slf4j.Logger;

import java.util.List;
import java.util.function.BiFunction;
import java.util.function.Function;

import static com.google.common.base.Preconditions.checkNotNull;
import static org.slf4j.LoggerFactory.getLogger;

/**
 * Function configurator to define a function to be applied when we
 * handle incoming JSON RPC request with params object that is
 * represented by a single object while the result of a function is a
 * list of objects.
 *
 * @param <P>
 *         type of params object
 * @param <R>
 *         type of result list items
 */
public class FunctionConfiguratorOneToMany<P, R> {
    private final static Logger LOGGER = getLogger(FunctionConfiguratorOneToMany.class);

    private final RequestHandlerManager handlerManager;

    private final String   method;
    private final Class<P> pClass;
    private final Class<R> rClass;

    FunctionConfiguratorOneToMany(RequestHandlerManager handlerManager, String method, Class<P> pClass, Class<R> rClass) {
        this.handlerManager = handlerManager;

        this.method = method;
        this.pClass = pClass;
        this.rClass = rClass;
    }

    /**
     * Define a binary function to be applied
     *
     * @param biFunction
     *         function
     */
    public void withBiFunction(BiFunction<String, P, List<R>> biFunction) {
        checkNotNull(biFunction, "Request function must not be null");

        LOGGER.debug("Configuring incoming request binary: " +
                     "function for method: " + method + ", " +
                     "params object class: " + pClass + ", " +
                     "result list items class: " + rClass);

        handlerManager.registerOneToMany(method, pClass, rClass, biFunction);
    }

    /**
     * Define a function to be applied
     *
     * @param biFunction
     *         function
     */
    public void withFunction(Function<P, List<R>> biFunction) {
        withBiFunction((s, p) -> biFunction.apply(p));
    }
}
