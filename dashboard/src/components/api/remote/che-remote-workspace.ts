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
import {CheJsonRpcMasterApi} from '../json-rpc/che-json-rpc-master-api.factory';
import {WebsocketClient} from '../json-rpc/websocket-client';

interface IRemoteWorkspaceResource<T> extends ng.resource.IResourceClass<T> {
  create: any;
  startWorkspace: any;
  getMachineToken: any;
  getDetails: any;
}

/**
 * This class is handling the call to remote API
 * @author Florent Benoit
 */
export class CheRemoteWorkspace {
  private $resource: ng.resource.IResourceService;
  private $q: ng.IQService;
  private remoteWorkspaceAPI: IRemoteWorkspaceResource<any>;
  private cheJsonRpcMasterApi: CheJsonRpcMasterApi;
  private authData: any;

  /**
   * Default constructor that is using resource
   */
  constructor($resource: ng.resource.IResourceService, $q: ng.IQService, $websocket: ng.websocket.IWebSocketProvider, authData: any) {
    this.$resource = $resource;
    this.$q = $q;

    let websocketClient = new WebsocketClient($websocket, $q);
    this.cheJsonRpcMasterApi = new CheJsonRpcMasterApi(websocketClient);
    this.authData = authData;

    // remote call
    this.remoteWorkspaceAPI = <IRemoteWorkspaceResource<any>>this.$resource('', {}, {
        getDetails: {method: 'GET', url: authData.url + '/api/workspace/:workspaceId?token=' + authData.token},
        getMachineToken: {method: 'GET', url: authData.url + '/api/machine/token/:workspaceId?token=' + authData.token},
        create: {method: 'POST', url: authData.url + '/api/workspace?token=' + authData.token},
        startWorkspace: {method: 'POST', url : authData.url + '/api/workspace/:workspaceId/runtime?environment=:envName&token=' + authData.token}
      }
    );
  }

  createWorkspaceFromConfig(workspaceConfig: any) {
    return this.remoteWorkspaceAPI.create(workspaceConfig).$promise;
  }

  /**
   * Provides machine token for given workspace
   * @param workspaceId the ID of the workspace
   * @returns {*}
   */
  getMachineToken(workspaceId: string) {
    let deferred = this.$q.defer();
    let deferredPromise = deferred.promise;

    let promise = this.remoteWorkspaceAPI.getMachineToken({workspaceId: workspaceId}, {}).$promise;
    promise.then((workspace: any) => {
      deferred.resolve(workspace);
    }, (error: any) => {
      deferred.reject(error);
    });

    return deferredPromise;
  }

  /**
   * Starts the given workspace by specifying the ID and the environment name
   * @param workspaceId the workspace ID
   * @param envName the name of the environment
   * @returns {*} promise
   */
  startWorkspace(remoteWsURL: string, workspaceId: string, envName: string) {
    let deferred = this.$q.defer();
    let deferredPromise = deferred.promise;
    this.cheJsonRpcMasterApi.connect(remoteWsURL).then(() => {
      this.cheJsonRpcMasterApi.subscribeWorkspaceStatus(workspaceId, (message: any) => {
        if (message.eventType === 'RUNNING' && message.workspaceId === workspaceId) {
          let promise = this.remoteWorkspaceAPI.getDetails({workspaceId: workspaceId}, {}).$promise;
          promise.then((workspace: any) => {
            deferred.resolve(workspace);
          }, (error: any) => {
            deferred.reject(error);
          });
        }
      });
    }, (error: any) => {
      deferred.reject(error);
    });

    this.remoteWorkspaceAPI.startWorkspace({workspaceId: workspaceId, envName : envName}, {}).$promise;

    return deferredPromise;
  }
}
