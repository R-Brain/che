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

import io.fabric8.kubernetes.api.model.IntOrString;
import io.fabric8.openshift.api.model.Route;

import org.eclipse.che.api.core.model.workspace.config.ServerConfig;

import java.util.HashMap;

import static com.google.common.base.Strings.nullToEmpty;

/**
 * @author Sergii Leshchenko
 */
public class RouteBuilder {
    private String name;
    private String       serviceName;
    private IntOrString  targetPort;
    private String       serverName;
    private ServerConfig serverConfig;

    public RouteBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public RouteBuilder withTo(String serviceName) {
        this.serviceName = serviceName;
        return this;
    }

    public RouteBuilder withTargetPort(String targetPortName) {
        this.targetPort = new IntOrString(targetPortName);
        return this;
    }

    public RouteBuilder withTargetPort(int targetPortName) {
        this.targetPort = new IntOrString(targetPortName);
        return this;
    }

    public RouteBuilder withServer(String serverName, ServerConfig serverConfig) {
        this.serverName = serverName;
        this.serverConfig = serverConfig;
        return this;
    }

    public Route build() {
        io.fabric8.openshift.api.model.RouteBuilder builder = new io.fabric8.openshift.api.model.RouteBuilder();
        HashMap<String, String> annotations = new HashMap<>();
        annotations.put(Constants.CHE_SERVER_NAME_ANNOTATION, serverName);
        annotations.put(Constants.CHE_SERVER_PROTOCOL_ANNOTATION, serverConfig.getProtocol());
        annotations.put(Constants.CHE_SERVER_PATH_ANNOTATION, nullToEmpty(serverConfig.getPath()));

        return builder.withNewMetadata()
                          .withName(name.replace("/", "-"))
                          .withAnnotations(annotations)
                      .endMetadata()
                      .withNewSpec()
                          .withNewTo()
                              .withName(serviceName)
                          .endTo()
                          .withNewPort()
                              .withTargetPort(targetPort)
                          .endPort()
                      .endSpec()
                      .build();
    }
}
