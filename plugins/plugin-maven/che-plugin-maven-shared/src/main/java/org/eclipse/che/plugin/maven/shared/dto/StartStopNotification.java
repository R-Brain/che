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
package org.eclipse.che.plugin.maven.shared.dto;

import org.eclipse.che.dto.shared.DTO;

/**
 * Info massage that points to client that messaging started/stopped
 *
 * @author Evgen Vidolob
 */
@DTO
public interface StartStopNotification extends MavenOutputEventDto{

    boolean isStart();

    void setStart(boolean start);
}
