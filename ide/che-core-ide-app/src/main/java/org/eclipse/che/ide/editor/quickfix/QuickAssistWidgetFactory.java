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
package org.eclipse.che.ide.editor.quickfix;

import org.eclipse.che.ide.api.editor.texteditor.TextEditor;

/** Factory for {@link QuickAssistWidget} instances. */
public interface QuickAssistWidgetFactory {

    /**
     * Create a {@link QuickAssistWidget}.
     * @param editor the editor
     * @return the new widget
     */
    QuickAssistWidget createWidget(TextEditor editor);
}
