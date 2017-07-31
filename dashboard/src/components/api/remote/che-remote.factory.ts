/*
 * Copyright (c) 2015-2017 Codenvy, S.A.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Codenvy, S.A. - initial API and implementation
 */
'use strict';

import {CheRemoteLogin} from './che-remote-login';
import {CheRemoteRecipe} from './che-remote-recipe';
import {CheRemoteWorkspace} from './che-remote-workspace';
import {CheRemoteProject} from './che-remote-project';

/**
 * This class is handling the call to remote API
 * @author Florent Benoit
 */
export class CheRemote {
  private $resource: ng.resource.IResourceService;
  private $q: ng.IQService;
  private $websocket: ng.websocket.IWebSocketProvider;

  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($resource: ng.resource.IResourceService, $q: ng.IQService, $websocket: ng.websocket.IWebSocketProvider) {
    this.$resource = $resource;
    this.$q = $q;
    this.$websocket = $websocket;
  }

  /**
   * Build a new remote authenticator
   * @param url the URL of the remote server
   * @param login the login on the remote server
   * @param password the password on the remote server
   * @returns {*|promise|N|n}
   */
  newAuth(url: string, login: string, password: string) {
    let remoteLogin = new CheRemoteLogin(this.$resource, url);
    return remoteLogin.authenticate(login, password);
  }

  /**
   * Build a new remote workspace handler
   * @param url the URL
   * @param token
   * @returns {*}
   */
  newWorkspace(remoteConfig: any) {
    return new CheRemoteWorkspace(this.$resource, this.$q, this.$websocket, remoteConfig);
  }

  /**
   * Build a new remote workspace handler
   * @param url the URL
   * @param token
   * @returns {*}
   */
  newProject(remoteConfig: any) {
    return new CheRemoteProject(this.$resource, remoteConfig);
  }

  /**
   * Build a new remote recipe handler
   * @param url the URL
   * @param token
   * @returns {*}
   */
  newRecipe(remoteConfig): any {
    return new CheRemoteRecipe(this.$resource, remoteConfig);
  }
}
