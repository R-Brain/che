/*
 * Copyright (c) 2015-2017 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';
import {CheAPI} from '../../components/api/che-api.factory';
import {CheWorkspace} from '../../components/api/che-workspace.factory';
import {RouteHistory} from '../../components/routing/route-history.service';
import {CheUIElementsInjectorService} from '../../components/injector/che-ui-elements-injector.service';

/**
 * This class is handling the service for viewing the IDE
 * @author Florent Benoit
 */
class IdeSvc {
  $location: ng.ILocationService;
  $log: ng.ILogService;
  $mdDialog: ng.material.IDialogService;
  $q: ng.IQService;
  $rootScope: ng.IRootScopeService;
  $sce: ng.ISCEService;
  $timeout: ng.ITimeoutService;
  $websocket: ng.websocket.IWebSocketProvider;
  cheAPI: CheAPI;
  cheWorkspace: CheWorkspace;
  lodash: any;
  proxySettings: any;
  routeHistory: RouteHistory;
  userDashboardConfig: any;
  cheUIElementsInjectorService: CheUIElementsInjectorService;

  ideParams: Map<string, string>;
  lastWorkspace: any;
  openedWorkspace: any;

  listeningChannels: string[];
  websocketReconnect: number;
  ideAction: string;

  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($location: ng.ILocationService, $log: ng.ILogService, $mdDialog: ng.material.IDialogService,
              $q: ng.IQService, $rootScope: ng.IRootScopeService, $sce: ng.ISCEService, $timeout: ng.ITimeoutService,
              $websocket: ng.websocket.IWebSocketProvider, cheAPI: CheAPI, cheWorkspace: CheWorkspace, lodash: any,
              proxySettings: any, routeHistory: RouteHistory, userDashboardConfig: any, cheUIElementsInjectorService: CheUIElementsInjectorService) {
    this.$location = $location;
    this.$log = $log;
    this.$mdDialog = $mdDialog;
    this.$q = $q;
    this.$rootScope = $rootScope;
    this.$sce = $sce;
    this.$timeout = $timeout;
    this.$websocket = $websocket;
    this.cheAPI = cheAPI;
    this.cheWorkspace = cheWorkspace;
    this.lodash = lodash;
    this.proxySettings = proxySettings;
    this.routeHistory = routeHistory;
    this.userDashboardConfig = userDashboardConfig;
    this.cheUIElementsInjectorService = cheUIElementsInjectorService;

    this.ideParams = new Map();

    this.lastWorkspace = null;
    this.openedWorkspace = null;

    this.listeningChannels = [];
  }

  displayIDE(): void {
    (this.$rootScope as any).showIDE = true;
  }

  restoreIDE(): void {
    (this.$rootScope as any).restoringIDE = true;
    this.displayIDE();
  }

  hasIdeLink(): boolean {
    return (this.$rootScope as any).ideIframeLink && ((this.$rootScope as any).ideIframeLink !== null);
  }

  handleError(error: any): void {
    this.$log.error(error);
  }

  startIde(workspace: any): ng.IPromise<any> {
    if (this.lastWorkspace) {
      this.cleanupChannels(this.lastWorkspace.id);
    }
    this.lastWorkspace = workspace;

    if (this.openedWorkspace && this.openedWorkspace.id === workspace.id) {
      this.openedWorkspace = null;
    }

    this.updateRecentWorkspace(workspace.id);

    let bus = this.cheAPI.getWebsocket().getBus();

    let startWorkspaceDefer = this.$q.defer();
    this.startWorkspace(bus, workspace).then(() => {
      // update list of workspaces
      // for new workspace to show in recent workspaces
      this.cheAPI.cheWorkspace.fetchWorkspaces();

      this.cheWorkspace.fetchStatusChange(workspace.id, 'RUNNING').then(() => {
        return this.cheWorkspace.fetchWorkspaceDetails(workspace.id);
      }).then(() => {
        startWorkspaceDefer.resolve();
      }, (error: any) => {
        this.handleError(error);
        startWorkspaceDefer.reject(error);
      });
      this.cheWorkspace.fetchStatusChange(workspace.id, 'ERROR').then((data: any) => {
        startWorkspaceDefer.reject(data);
      });
    }, (error: any) => {
      startWorkspaceDefer.reject(error);
    });

    return startWorkspaceDefer.promise.then(() => {
      if (this.lastWorkspace && workspace.id === this.lastWorkspace.id) {
        // now that the container is started, wait for the extension server. For this, needs to get runtime details
        let websocketUrl = this.cheWorkspace.getWebsocketUrl(workspace.id);
        // try to connect
        this.websocketReconnect = 50;
        this.connectToExtensionServer(websocketUrl, workspace.id);
      } else {
        this.cleanupChannels(workspace.id);
      }
      return this.$q.resolve();
    }, (error: any) => {
      if (this.lastWorkspace && workspace.id === this.lastWorkspace.id) {
        this.cleanupChannels(workspace.id);
      }
      return this.$q.reject(error);
    });
  }

  startWorkspace(bus: any, data: any): ng.IPromise<any> {
    let startWorkspacePromise = this.cheAPI.getWorkspace().startWorkspace(data.id, data.config.defaultEnv);

    startWorkspacePromise.then((data: any) => {
      let statusLink = this.lodash.find(data.links, (link: any) => {
        return link.rel === 'environment.status_channel';
      });

      let workspaceId = data.id;

      let agentChannel = 'workspace:' + data.id + ':ext-server:output';
      let statusChannel = statusLink ? statusLink.parameters[0].defaultValue : null;

      this.listeningChannels.push(statusChannel);
      // for now, display log of status channel in case of errors
      bus.subscribe(statusChannel, (message: any) => {
        if (message.eventType === 'ERROR' && message.workspaceId === data.id) {
          let errorMessage = 'Error when trying to start the workspace';
          if (message.error) {
            errorMessage += ': ' + message.error;
          } else {
            errorMessage += '.';
          }
          // need to show the error
          this.$mdDialog.show(
            this.$mdDialog.alert()
              .title('Error when starting workspace')
              .content('Unable to start workspace. ' + errorMessage)
              .ariaLabel('Workspace start')
              .ok('OK')
          );
        }
        this.$log.log('Status channel of workspaceID', workspaceId, message);
      });

      this.listeningChannels.push(agentChannel);
      bus.subscribe(agentChannel, (message: any) => {
        if (message.eventType === 'ERROR' && message.workspaceId === data.id) {
          // need to show the error
          this.$mdDialog.show(
            this.$mdDialog.alert()
              .title('Error when starting agent')
              .content('Unable to start workspace agent. Error when trying to start the workspace agent: ' + message.error)
              .ariaLabel('Workspace agent start')
              .ok('OK')
          );
        }
      });
    }, (error: any) => {
      this.handleError(error);
      this.$q.reject(error);
    });

    return startWorkspacePromise;
  }

  connectToExtensionServer(websocketURL: string, workspaceId: string): void {
    // try to connect
    let websocketStream = this.$websocket(websocketURL);

    // on success, create project
    websocketStream.onOpen(() => {
      this.cleanupChannels(workspaceId, websocketStream);
    });

    // on error, retry to connect or after a delay, abort
    websocketStream.onError((error: any) => {
      this.websocketReconnect--;
      if (this.websocketReconnect > 0) {
        this.$timeout(() => {
          this.connectToExtensionServer(websocketURL, workspaceId);
        }, 1000);
      } else {
        this.cleanupChannels(workspaceId, websocketStream);
        this.$log.error('error when starting remote extension', error);
        // need to show the error
        this.$mdDialog.show(
          this.$mdDialog.alert()
            .title('Unable to create project')
            .content('Unable to connect to the remote extension server after workspace creation')
            .ariaLabel('Project creation')
            .ok('OK')
        );
      }
    });
  }

  setLoadingParameter(paramName: string, paramValue: string): void {
    this.ideParams.set(paramName, paramValue);
  }

  setIDEAction(ideAction: string): void {
    this.ideAction = ideAction;
  }

  openIde(workspaceId: string): void {
    (this.$rootScope as any).hideNavbar = false;

    this.updateRecentWorkspace(workspaceId);

    let inDevMode = this.userDashboardConfig.developmentMode;
    let randVal = Math.floor((Math.random() * 1000000) + 1);
    let appendUrl = '?uid=' + randVal;

    let workspace = this.cheWorkspace.getWorkspaceById(workspaceId);
    this.openedWorkspace = workspace;

    let ideUrlLink = this.getHrefLink(workspace, 'ide url');

    if (this.ideAction != null) {
      appendUrl = appendUrl + '&action=' + this.ideAction;

      // reset action
      this.ideAction = null;
    }

    if (this.ideParams) {
      for (let [key, val] of this.ideParams) {
        appendUrl = appendUrl + '&' + key + '=' + val;
      }
      this.ideParams.clear();
    }

    // perform remove of iframes in parent node. It's needed to avoid any script execution (canceled requests) on iframe source changes.
    let iframeParent = angular.element('#ide-application-frame');
    iframeParent.find('iframe').remove();

    if (inDevMode) {
      (this.$rootScope as any).ideIframeLink = this.$sce.trustAsResourceUrl(ideUrlLink + appendUrl);
    } else {
      (this.$rootScope as any).ideIframeLink = ideUrlLink + appendUrl;
    }

    let defer = this.$q.defer();
    if (workspace.status === 'RUNNING') {
      defer.resolve();
    } else {
      this.cheWorkspace.fetchStatusChange(workspace.id, 'STARTING').then(() => {
        defer.resolve();
      }, (error: any) => {
        defer.reject(error);
        this.$log.error('Unable to start workspace: ', error);
      });
    }
    defer.promise.then(() => {
      this.cheWorkspace.fetchWorkspaces().then(() => {
        let another_defer = this.$q.defer();
        if (workspace.status === 'RUNNING') {
          let cur_workspace = this.cheWorkspace.getWorkspaceById(workspaceId);
          if (cur_workspace.runtime) {
            another_defer.resolve();
          } else {
            this.cheWorkspace.fetchWorkspaceDetails(workspaceId).then(() => {
              another_defer.resolve();
            });
          }
        } else {
          this.cheWorkspace.fetchStatusChange(workspace.id, 'RUNNING').then(() => {
            return this.cheWorkspace.fetchWorkspaceDetails(workspaceId);
          }).then(() => {
            another_defer.resolve();
          });
        }
        another_defer.promise.then(() => {
          let cur_workspace = this.cheWorkspace.getWorkspaceById(workspaceId);
          if (this.lodash.get(cur_workspace, 'runtime.machines.0.runtime.envVariables.RIDE')) {
            const idePort = this.lodash.get(cur_workspace, 'runtime.machines.0.runtime.servers.8888/tcp.address').split(':')[1];
            const proxyPort = this.lodash.get(cur_workspace, 'runtime.machines.0.runtime.servers.8080/tcp.address').split(':')[1];
            const wsPort =  this.lodash.get(cur_workspace, 'runtime.machines.0.runtime.servers.8081/tcp.address').split(':')[1];
            let ideUrl = `${location.origin}:${idePort}/ride?websocket=${wsPort}&proxy=${proxyPort}`;
            (this.$rootScope as any).ideIframeLink = (this.$sce as any).trustAsResourceUrl(ideUrl);
          }
          // iframe element for IDE application:
          let iframeElement = '<iframe class=\"ide-page-frame\" id=\"ide-application-iframe\" ng-src=\"{{ideIframeLink}}\" ></iframe>';
          this.cheUIElementsInjectorService.injectAdditionalElement(iframeParent, iframeElement);
          (this.$rootScope as any).showIDE = true;
          (this.$rootScope as any).hideLoader = true;
        });
      });
    });
  }

  /**
   * Cleanup the websocket channels (unsubscribe)
   */
  cleanupChannels(workspaceId: string, websocketStream?: any): void {
    if (websocketStream != null) {
      websocketStream.close();
    }

    let workspaceBus = this.cheAPI.getWebsocket().getBus();

    if (workspaceBus != null) {
      this.listeningChannels.forEach((channel: any) => {
        workspaceBus.unsubscribe(channel);
      });
      this.listeningChannels.length = 0;
    }
  }

  /**
   * Gets link from a workspace
   * @param workspace the workspace on which analyze the links
   * @param name the name of the link to find (rel attribute)
   * @returns empty or the href attribute of the link
   */
  getHrefLink(workspace: any, name: string): string {
    let links = workspace.links;
    let i = 0;
    while (i < links.length) {
      let link = links[i];
      if (link.rel === name) {
        return link.href;
      }
      i++;
    }
    return '';
  }

  /**
   * Emit event to move workspace immediately
   * to top of the recent workspaces list
   *
   * @param workspaceId
   */
  updateRecentWorkspace(workspaceId: string): void {
    this.$rootScope.$broadcast('recent-workspace:set', workspaceId);
  }
}

export default IdeSvc;
