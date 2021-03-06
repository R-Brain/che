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
package org.eclipse.che.requirejs.conf;

import com.google.gwt.core.client.JavaScriptObject;

public class ConfigItem extends AssocitativeJsObject<JavaScriptObject> {

    protected ConfigItem() {
    }

    public static final native ConfigItem create() /*-{
        return {};
    }-*/;
}
