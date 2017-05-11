package org.eclipse.che.ide.logger.impl;

import com.google.gwt.core.client.GWT;
import org.slf4j.ILoggerFactory;

/**
 *
 * @author Andrei Korzhevskii <a.korzhevskiy@gmail.com>
 */
public class Impl {
  public static final ILoggerFactory LOGGER_FACTORY = GWT.create(ILoggerFactory.class);

  private Impl() {
  }
}
