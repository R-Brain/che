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
package org.eclipse.che.ide.ext.java.client.project.classpath.valueproviders.selectnode.interceptors;

import com.google.inject.Singleton;

import org.eclipse.che.api.promises.client.Promise;
import org.eclipse.che.api.promises.client.js.Promises;
import org.eclipse.che.ide.api.data.tree.Node;
import org.eclipse.che.ide.ext.java.shared.ClasspathEntryKind;

import java.util.ArrayList;
import java.util.List;

/**
 * Interceptor for showing only folder nodes.
 *
 * @author Valeriy Svydenko
 */
@Singleton
public class JarNodeInterceptor implements ClasspathNodeInterceptor {
    private final static String JAR = ".jar";

    @Override
    public Promise<List<Node>> intercept(Node parent, List<Node> children) {
        List<Node> nodes = new ArrayList<>();

        for (Node child : children) {
            if (!child.isLeaf() || child.getName().endsWith(JAR)) {
                nodes.add(child);
            }
        }

        return Promises.resolve(nodes);
    }

    @Override
    public int getPriority() {
        return NORM_PRIORITY;
    }

    @Override
    public boolean isNodeValid(Node node) {
        return node.getName().endsWith(JAR);
    }

    @Override
    public int getKind() {
        return ClasspathEntryKind.LIBRARY;
    }
}
