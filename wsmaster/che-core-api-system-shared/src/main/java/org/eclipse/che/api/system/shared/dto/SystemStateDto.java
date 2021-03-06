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
package org.eclipse.che.api.system.shared.dto;

import org.eclipse.che.api.core.rest.shared.dto.Hyperlinks;
import org.eclipse.che.api.core.rest.shared.dto.Link;
import org.eclipse.che.api.system.shared.SystemStatus;
import org.eclipse.che.dto.shared.DTO;

import java.util.List;

/**
 * Describes current system state.
 *
 * @author Yevhenii Voevodin
 */
@DTO
public interface SystemStateDto extends Hyperlinks {

    /**
     * Returns current system status.
     */
    SystemStatus getStatus();

    void setStatus(SystemStatus status);

    SystemStateDto withStatus(SystemStatus status);

    SystemStateDto withLinks(List<Link> links);
}
