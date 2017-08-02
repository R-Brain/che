/*******************************************************************************
 * Copyright (c) 2012-2017 Codenvy, S.A.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Codenvy, S.A. - initial API and implementation
 *******************************************************************************/
package org.eclipse.che.workspace.infrastructure.openshift;

import io.fabric8.kubernetes.api.model.Service;
import io.fabric8.kubernetes.api.model.ServicePort;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author Sergii Leshchenko
 */
public class ServiceBuilder {
    private String name;
    private Map<String, String> selector = new HashMap<>();
    private List<ServicePort>   ports    = new ArrayList<>();

    public ServiceBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public ServiceBuilder withSelectorEntry(String key, String value) {
        selector.put(key, value);
        return this;
    }

    public ServiceBuilder withPorts(List<ServicePort> ports) {
        this.ports = ports;
        return this;
    }

    public Service build() {
        io.fabric8.kubernetes.api.model.ServiceBuilder builder = new io.fabric8.kubernetes.api.model.ServiceBuilder();
        return builder.withNewMetadata()
                          .withName(name.replace("/", "-"))
                      .endMetadata()
                      .withNewSpec()
                          .withSelector(selector)
                          .withPorts(ports)
                      .endSpec()
                      .build();
    }
}
