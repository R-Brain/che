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
package org.eclipse.che.ide.ext.java.client.navigation.node;

import com.google.inject.Inject;
import com.google.inject.assistedinject.Assisted;

import org.eclipse.che.api.promises.client.Promise;
import org.eclipse.che.ide.api.data.tree.HasAction;
import org.eclipse.che.ide.api.data.tree.Node;
import org.eclipse.che.ide.ext.java.client.JavaResources;
import org.eclipse.che.ide.ext.java.client.navigation.filestructure.FileStructurePresenter;
import org.eclipse.che.ide.ext.java.client.util.Flags;
import org.eclipse.che.ide.ext.java.shared.dto.model.Initializer;
import org.eclipse.che.ide.ui.smartTree.presentation.NodePresentation;
import org.vectomatic.dom.svg.ui.SVGResource;

import javax.validation.constraints.NotNull;
import java.util.List;

/**
 * Representation of java initializer block for the java navigation tree.
 *
 * @author Valeriy Svydenko
 */
public class InitializerNode extends AbstractPresentationNode implements HasAction {
    private final JavaResources          resources;
    private final boolean                isFromSuper;
    private final FileStructurePresenter fileStructurePresenter;
    private final Initializer            initializer;

    @Inject
    public InitializerNode(JavaResources resources,
                           @Assisted Initializer initializer,
                           @Assisted("showInheritedMembers") boolean showInheritedMembers,
                           @Assisted("isFromSuper") boolean isFromSuper,
                           FileStructurePresenter fileStructurePresenter) {
        this.initializer = initializer;
        this.resources = resources;
        this.isFromSuper = isFromSuper;
        this.fileStructurePresenter = fileStructurePresenter;
    }

    /** {@inheritDoc} */
    @Override
    protected Promise<List<Node>> getChildrenImpl() {
        return null;
    }

    /** {@inheritDoc} */
    @Override
    public void updatePresentation(@NotNull NodePresentation presentation) {
        updatePresentationField(isFromSuper, presentation, initializer.getLabel(), resources);

        SVGResource icon;
        int flag = initializer.getFlags();
        if (Flags.isPublic(flag)) {
            icon = resources.publicMethod();
        } else if (Flags.isPrivate(flag)) {
            icon = resources.privateMethod();
        } else if (Flags.isProtected(flag)) {
            icon = resources.protectedMethod();
        } else {
            icon = resources.publicMethod();
        }
        presentation.setPresentableIcon(icon);
    }

    /** {@inheritDoc} */
    @Override
    public String getName() {
        return initializer.getElementName();
    }

    /** {@inheritDoc} */
    @Override
    public boolean isLeaf() {
        return true;
    }

    /** {@inheritDoc} */
    @Override
    public void actionPerformed() {
        fileStructurePresenter.actionPerformed(initializer);
    }

}
