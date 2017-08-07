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

import io.fabric8.kubernetes.api.model.Container;
import io.fabric8.kubernetes.api.model.ContainerPort;
import io.fabric8.kubernetes.api.model.IntOrString;
import io.fabric8.kubernetes.api.model.Service;
import io.fabric8.kubernetes.api.model.ServicePort;
import io.fabric8.openshift.api.model.Route;

import org.eclipse.che.api.core.model.workspace.config.ServerConfig;
import org.eclipse.che.workspace.infrastructure.openshift.environment.OpenShiftEnvironment;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.eclipse.che.workspace.infrastructure.openshift.Constants.CHE_POD_NAME_LABEL;

/**
 * Helps to modify {@link OpenShiftEnvironment} to make servers that are
 * configured by {@link ServerConfig} public accessible.
 *
 * <p>To make server accessible it is needed to make sure that container port is declared,
 * create {@link Service} and corresponding {@link Route} for exposing this port.
 *
 * <p>Container, service and route are linked in the following way:
 *
 * <pre>
 * Pod
 * metadata:
 *   labels:
 *     type: web-app
 * spec:
 *   containers:
 *   ...
 *   - ports:
 *     - containerPort: 8080
 *       name: web-app
 *       protocol: TCP
 *   ...
 * </pre>
 *
 * Then services expose containers ports in the following way:
 * <pre>
 * Service
 * metadata:
 *   name: service123
 * spec:
 *   selector:                        ---->> Pod.metadata.labels
 *     type: web-app
 *   ports:
 *     - name: web-app
 *       port: 8080
 *       targetPort: [8080|web-app]   ---->> Pod.spec.ports[0].[containerPort|name]
 *       protocol: TCP                ---->> Pod.spec.ports[0].protocol
 * </pre>
 *
 * Then corresponding route expose one of the service' port:
 * <pre>
 * Route
 * ...
 * spec:
 *   to:
 *     name: dev-machine              ---->> Service.metadata.name
 *     targetPort: [web-app|8080]     ---->> Service.spec.ports[0].[name|port]
 * </pre>
 *
 * @author Sergii Leshchenko
 */
public class ServerExposeUtils {
    public static void expose(String machineName,
                              Container containerConfig,
                              Map<String, ? extends ServerConfig> servers,
                              OpenShiftEnvironment openshiftEnvironment,
                              String namePrefix) {
        Map<String, ServicePort> portToServicePort = expose(containerConfig, servers.values());

        Service service = new ServiceBuilder().withName(namePrefix + machineName)
                                              .withSelectorEntry(CHE_POD_NAME_LABEL, machineName.split("/")[0])
                                              .withPorts(new ArrayList<>(portToServicePort.values()))
                                              .build();
        openshiftEnvironment.getServices().put(service.getMetadata().getName(), service);

        for (Map.Entry<String, ? extends ServerConfig> serverEntry : servers.entrySet()) {
            String serverName = serverEntry.getKey();
            ServerConfig serverConfig = serverEntry.getValue();
            ServicePort servicePort = portToServicePort.get(serverConfig.getPort());

            //TODO 1 route for 1 service port could be enough. Implement it in scope of //TODO https://github.com/eclipse/che/issues/5688
            Route route = new RouteBuilder().withName(namePrefix + "-" + machineName + "-" + serverName)
                                            .withTargetPort(servicePort.getName())
                                            .withServer(serverName, serverConfig)
                                            .withTo(service.getMetadata().getName())
                                            .build();
            openshiftEnvironment.getRoutes().put(route.getMetadata().getName(), route);
        }
    }

    private static Map<String, ServicePort> expose(Container container,
                                                   Collection<? extends ServerConfig> serverConfig) {
        Map<String, ServicePort> exposedPorts = new HashMap<>();
        Set<String> portsToExpose = serverConfig.stream()
                                                .map(ServerConfig::getPort)
                                                .collect(Collectors.toSet());

        for (String portToExpose : portsToExpose) {
            String[] portProtocol = portToExpose.split("/");
            int port = Integer.parseInt(portProtocol[0]);
            String protocol = portProtocol.length > 1 ? portProtocol[1].toUpperCase() : null;
            Optional<ContainerPort> exposedOpt = container.getPorts()
                                                          .stream()
                                                          .filter(p -> p.getContainerPort().equals(port) &&
                                                                       p.getProtocol().equals(protocol))
                                                          .findAny();
            ContainerPort containerPort;

            if (exposedOpt.isPresent()) {
                containerPort = exposedOpt.get();
            } else {
                containerPort = new ContainerPort(port,
                                                  null,//hostIp
                                                  null,//hostPort
                                                  null,//name
                                                  protocol);
                container.getPorts().add(containerPort);
            }

            exposedPorts.put(portToExpose, new ServicePort("server-" + containerPort.getContainerPort(),
                                                           null, //nodePort
                                                           containerPort.getContainerPort(),
                                                           containerPort.getProtocol(),
                                                           new IntOrString(containerPort.getContainerPort())));
        }
        return exposedPorts;
    }
}
