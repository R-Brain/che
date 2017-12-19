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
  $http: ng.IHttpService;
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

  startupSteps: any[];
  currentStartupStep: number;
  isStarting: boolean;

  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($location: ng.ILocationService, $log: ng.ILogService, $mdDialog: ng.material.IDialogService, $http: ng.IHttpService,
              $window,
              $q: ng.IQService, $rootScope: ng.IRootScopeService, $sce: ng.ISCEService, $timeout: ng.ITimeoutService,
              $websocket: ng.websocket.IWebSocketProvider, cheAPI: CheAPI, cheWorkspace: CheWorkspace, lodash: any,
              proxySettings: any, routeHistory: RouteHistory, userDashboardConfig: any, cheUIElementsInjectorService: CheUIElementsInjectorService) {
    this.$location = $location;
    this.$log = $log;
    this.$mdDialog = $mdDialog;
    this.$http = $http;
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

    this.startupSteps = [
        {text: 'Starting workspace runtime', inProgressText: 'Retrieving the stack\'s image and launching it', logs: '', hasError: false},
        {text: 'Starting workspace agent', inProgressText: 'Agents provide RESTful services like intellisense and SSH', logs: '', hasError: false},
        {text: 'Workspace started', inProgressText: 'Opening', logs: '', hasError: false}
    ];
    this.currentStartupStep = 0;

    $window.addEventListener('message', (event) => {
      const workspaceId = (/workspace-activity:(.*)/.exec(event.data) || [])[1];
      if (workspaceId) {
        this.logWorkspaceActivity(workspaceId);
      }
    }, false);
  }

  logWorkspaceActivity(workspaceId: string): void {
    this.$http.put('/api/activity/' + workspaceId, '').then(() => {
      this.$log.info('Workspace activity for WORKSPACE_ID: ' + workspaceId);
    }).catch((error) => {
      this.$log.error('{' + workspaceId + ') ' + error);
    });
  }

  getStartupSteps(): any[] {
    return this.startupSteps;
  }

  getCurrentProgressStep(): number {
    return this.currentStartupStep;
  }

  setCurrentProgressStep(currentStartupStep: number): void {
    this.currentStartupStep = currentStartupStep;
  }

  getStepText(stepNumber: number) {
    let entry = this.startupSteps[stepNumber];
    if (this.currentStartupStep >= stepNumber) {
      return entry.inProgressText;
    } else {
      return entry.text;
    }
  }

  isIdeStarting(): any {
    return this.isStarting;
  }

  setIdeStarting(isStarting: boolean): any {
    this.isStarting = isStarting;
  }

  resetStartingProgress() {
    console.warn('resetStartingProgress');
    this.startupSteps.forEach((step) => {
      step.logs = '';
      step.hasError = false;
    });
    this.currentStartupStep = 0;
    this.isStarting = false;
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
    (this.$rootScope as any).showIDE = false;

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
      this.cheWorkspace.fetchWorkspaces();

      this.cheWorkspace.fetchStatusChange(workspace.id, 'RUNNING').then(() => {
        return this.fetchWorkspaceDetails(workspace.id);
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
    this.setCurrentProgressStep(0);

    let startWorkspacePromise = this.cheAPI.getWorkspace().startWorkspace(data.id, data.config.defaultEnv);

    startWorkspacePromise.then((data: any) => {
      let statusLink = this.lodash.find(data.links, (link: any) => {
        return link.rel === 'environment.status_channel';
      });

      let outputLink = this.lodash.find(data.links, (link: any) => {
        return link.rel === 'environment.output_channel';
      });

      let workspaceId = data.id;

      let agentChannel = 'workspace:' + data.id + ':ext-server:output';
      let statusChannel = statusLink ? statusLink.parameters[0].defaultValue : null;
      let outputChannel = outputLink ? outputLink.parameters[0].defaultValue : null;

      this.listeningChannels.push(statusChannel);
      // for now, display log of status channel in case of errors
      bus.subscribe(statusChannel, (message: any) => {
        this.getStartupSteps()[this.getCurrentProgressStep()].hasError = true;

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
        const agentStep = 1;
        if (this.getCurrentProgressStep() < agentStep) {
          this.setCurrentProgressStep(agentStep);
        }

        const step = this.getStartupSteps()[agentStep];
        if (step.logs.length > 0) {
          step.logs = step.logs + '\n' + message;
        } else {
          step.logs = message;
        }

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

      if (outputChannel) {
        this.listeningChannels.push(outputChannel);
        bus.subscribe(outputChannel, (message: any) => {
          message = this.getDisplayMachineLog(message);
          const step = this.getStartupSteps()[this.getCurrentProgressStep()];
          if (step.logs.length > 0) {
            step.logs = step.logs + '\n' + message;
          } else {
            step.logs = message;
          }
        });
      }

    }, (error: any) => {
      const errorMessage = 'Unable to start this workspace.';
      this.getStartupSteps()[this.getCurrentProgressStep()].logs = errorMessage;
      this.getStartupSteps()[this.getCurrentProgressStep()].hasError = true;

      this.handleError(error);
      this.$q.reject(error);
    });

    return startWorkspacePromise;
  }

  getDisplayMachineLog(log: any): string {
    log = angular.fromJson(log);
    if (angular.isObject(log)) {
      return '[' + log.machineName + '] ' + log.content;
    } else {
      return log;
    }
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

    let defer = this.$q.defer<che.IWorkspace>();
    defer.promise.then((workspace: che.IWorkspace) => {
      this.openedWorkspace = workspace;
      if (!workspace || !workspace.runtime || !workspace.runtime.devMachine) {

        workspace = this.cheWorkspace.getWorkspaceById(workspaceId);
        this.openedWorkspace = workspace;

        if (!workspace || !workspace.runtime || !workspace.runtime.devMachine) {
          this.$log.error('workspace runtime could not be initialized');
          return;
        }
      }

      if (workspace.runtime.devMachine.runtime.envVariables.RIDE) {
        const proxyPort = this.lodash.get(workspace, 'runtime.machines.0.runtime.servers.8080/tcp.address').split(':')[1];
        let ideUrl = `${location.origin}:${proxyPort}/p8080/ride`;
        if (location.protocol == 'https:') {
          ideUrl = `${location.origin}/ssl_${proxyPort}/p8080/ride`;
        }
        (this.$rootScope as any).ideIframeLink = (this.$sce as any).trustAsResourceUrl(ideUrl);
      } else {
        if (inDevMode) {
          (this.$rootScope as any).ideIframeLink = this.$sce.trustAsResourceUrl(ideUrlLink + appendUrl);
        } else {
          (this.$rootScope as any).ideIframeLink = ideUrlLink + appendUrl;
        }
      }
      // iframe element for IDE application:
      let iframeElement = '<iframe class=\"ide-page-frame\" id=\"ide-application-iframe\" ng-src=\"{{ideIframeLink}}\" ></iframe>';
      this.cheUIElementsInjectorService.injectAdditionalElement(iframeParent, iframeElement);
      (this.$rootScope as any).showIDE = true;
      (this.$rootScope as any).hideLoader = true;
    });

    if (workspace.status === 'RUNNING') {
      this.fetchWorkspaceDetails(workspace.id).then((workspace: che.IWorkspace) => {
        defer.resolve(workspace);
      });
    } else {
      (this.$rootScope as any).showIDE = false;
      this.cheWorkspace.startUpdateWorkspaceStatus(workspace.id);
      this.cheWorkspace.fetchStatusChange(workspace.id, 'RUNNING').then(() => {
        return this.fetchWorkspaceDetails(workspace.id);
      }).then((workspace: che.IWorkspace) => {
        defer.resolve(workspace);
      });
      this.cheWorkspace.fetchWorkspaces();
    }
  }

  fetchWorkspaceDetails(workspaceKey: string): ng.IPromise<che.IWorkspace> {
    const defer = this.$q.defer<che.IWorkspace>();
    const promise: ng.IHttpPromise<any> = this.$http.get('/api/workspace/' + workspaceKey, { headers: { 'If-None-Match': '"1234567890"' } });
    promise.then((response: ng.IHttpPromiseCallbackArg<che.IWorkspace>) => {
      const data = response.data;
      defer.resolve(data);
    }, (error: any) => {
      defer.reject(error);
    });
    return defer.promise;
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
