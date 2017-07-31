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
import {CheNotification} from '../../../../../components/notification/che-notification.factory';
import {CheRemote} from '../../../../../components/api/remote/che-remote.factory';

/**
 * @ngdoc controller
 * @name workspace.export.controller:ExportWorkspaceDialogController
 * @description This class is handling the controller for the dialog box about the export of workspace
 * @author Florent Benoit
 */
export class ExportWorkspaceDialogController {
  private $q: ng.IQService;
  private $filter: ng.IFilterService;
  private cheNotification: CheNotification;
  private $log: ng.ILogService;
  private $mdDialog: ng.material.IDialogService;
  private cheRemote: CheRemote;
  private $scope: ng.IScope;
  private $window: ng.IWindowService;
  private lodash: _.LoDashStatic;

  private editorOptions: any;
  private destination: string;
  private privateCloudUrl: string;
  private privateCloudLogin: string;
  private privateCloudPassword: string;
  private importInProgress: boolean;

  private copyOfConfig: any;
  private exportConfigContent: any;
  private workspaceDetails: any;
  private exportInCloudSteps: string;


  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($q: ng.IQService, $filter: ng.IFilterService, lodash: _.LoDashStatic, cheRemote: CheRemote,
              cheNotification: CheNotification, $mdDialog: ng.material.IDialogService, $log: ng.ILogService,
              $window: ng.IWindowService, $scope: ng.IScope) {
    this.$q = $q;
    this.$filter = $filter;
    this.lodash = lodash;
    this.cheRemote = cheRemote;
    this.cheNotification = cheNotification;
    this.$mdDialog = $mdDialog;
    this.$log = $log;
    this.$window = $window;

    this.editorOptions = {
      lineWrapping : true,
      lineNumbers: false,
      matchBrackets: true,
      readOnly: true,
      mode: 'application/json'
    };
    this.privateCloudUrl = '';
    this.privateCloudLogin = '';
    this.privateCloudPassword = '';
    this.importInProgress = false;

    this.copyOfConfig = this.getCopyOfConfig();
    this.exportConfigContent = this.$filter('json')(angular.fromJson(this.copyOfConfig), 2);

    $scope.selectedIndex = this.destination === 'file' ? 0 : 1;
  }

  /**
   * It will hide the dialog box.
   */
  hide() {
    this.$mdDialog.hide();
  }

  /**
   * Returns copy of workspace's config without unnecessary properties
   * @returns {*}
   */
  getCopyOfConfig() {
    let copyOfConfig = angular.copy(this.workspaceDetails.config);

    return this.removeLinks(copyOfConfig);
  }

  /**
   * Recursively remove 'links' property from object
   *
   * @param object {Object} object to iterate
   * @returns {*}
   */
  removeLinks(object: any) {
    delete object.links;

    return this.lodash.forEach(object, (value) => {
      if (angular.isObject(value)) {
        return this.removeLinks(value);
      } else {
        return value;
      }
    });
  }

  /**
   * Provide ability to download workspace's config
   */
  downloadConfig() {
    this.$window.open('data:text/csv,' + encodeURIComponent(this.exportConfigContent));
  }

  /**
   * Start the process to export to the private Cloud
   */
  exportToPrivateCloud() {
    this.exportInCloudSteps = '';
    this.importInProgress = true;
    let login = this.cheRemote.newAuth(this.privateCloudUrl, this.privateCloudLogin, this.privateCloudPassword);

    login.then((authData: any) => {
      let copyOfConfig = angular.copy(this.copyOfConfig);
      copyOfConfig.name = 'import-' + copyOfConfig.name;
      this.exportToPrivateCloudWorkspace(copyOfConfig, authData);
      // get content of the recipe
    }, (error: any) => {
      this.handleError(error);
    });
  }

  /**
   * Export the given workspace using authentication data provided and using specified recipe content
   * @param recipeScriptContent the content of the machine configuration
   * @param workspaceConfig the workspace configuration to use
   * @param authData the data including token to deal with remote server
   */
  exportToPrivateCloudWorkspace(workspaceConfig: any, authData: any) {
    let remoteWorkspaceAPI = this.cheRemote.newWorkspace(authData);
    this.exportInCloudSteps += 'Creating remote workspace...';
    let createWorkspacePromise = remoteWorkspaceAPI.createWorkspaceFromConfig(workspaceConfig);
    createWorkspacePromise.then((remoteWorkspace : any) => {
      this.exportInCloudSteps += 'ok !<br>';

      if (remoteWorkspace.config.projects && remoteWorkspace.config.projects.length > 0) {
        this.startRemoteWorkspace(remoteWorkspaceAPI, remoteWorkspace, authData);
      } else {
        this.finishWorkspaceExporting(remoteWorkspace);
      }
    }, (error: any) => {
      this.handleError(error);
    });
  }

  /**
   * Start remote workspace.
   *
   * @param remoteWorkspaceAPI remote workspace API
   * @param remoteWorkspace workspace to start
   * @param authData remote url and token data
   */
  startRemoteWorkspace(remoteWorkspaceAPI: any, remoteWorkspace: any, authData: any) {
    this.exportInCloudSteps += 'Starting remote workspace...';

    // compute WS url
    let remoteURL = authData.url;
    let remoteWsURL = remoteURL.replace('http', 'ws');

    let startWorkspacePromise = remoteWorkspaceAPI.startWorkspace(remoteWsURL, remoteWorkspace.id, remoteWorkspace.config.defaultEnv);
    startWorkspacePromise.then((workspace: any) => {
      let wsAgentLink = this.lodash.find(workspace.runtime.links, (link: any) => {
        return link.rel === 'wsagent';
      });


      // grab token for machine
      let tokenPromise = remoteWorkspaceAPI.getMachineToken(remoteWorkspace.id);
      tokenPromise.then((machineTokenResult: any) => {
        // ask with machine token
        let agentAuthData = {url: wsAgentLink.href, token: machineTokenResult.machineToken};
        let remoteProjectAPI = this.cheRemote.newProject(agentAuthData);

        this.exportInCloudSteps += 'ok !<br>';
        // ok now we've to import each project with a location into the remote workspace
        let importProjectsPromise = this.importProjectsIntoWorkspace(remoteProjectAPI, remoteWorkspace);
        importProjectsPromise.then(() => {
          this.finishWorkspaceExporting(remoteWorkspace);
        }, (error: any) => {
          this.handleError(error);
        });
      }, (error: any) => {
        this.handleError(error);
      });



    }, (error: any) => {
      this.handleError(error);
    });
  }

  /**
   * Import all projects with a given source location into the remote workspace
   *
   * @param remoteProjectAPI the remote project API
   * @param workspace the remote workspace
   */
  importProjectsIntoWorkspace(remoteProjectAPI: any, workspace: any) {
    var projectPromises = [];

    workspace.config.projects.forEach((project: any) => {
      if (project.source && project.source.location && project.source.location.length > 0) {
        let deferred = this.$q.defer();
        let deferredPromise = deferred.promise;
        projectPromises.push(deferredPromise);
        let importProjectPromise = remoteProjectAPI.importProject(project.name, project.source);

        importProjectPromise.then(() => {
          this.exportInCloudSteps += 'Importing project ' + project.name + '...<br>';
          let updateProjectPromise = remoteProjectAPI.updateProject(project.name, project);
          updateProjectPromise.then(() => {
            deferred.resolve(workspace);
          }, (error: any) => {
            deferred.reject(error);
          });
        }, (error: any) => {
          deferred.reject(error);
        });
      }
    });
    return this.$q.all(projectPromises);
  }

  /**
   * Finilize the Workspace exporting - show proper messages, close popup.
   *
   * @param remoteWorkspace the remote exported workspace
   */
  finishWorkspaceExporting(remoteWorkspace: any) {
    this.exportInCloudSteps += 'Export of workspace ' + remoteWorkspace.config.name + 'finished <br>';
    this.cheNotification.showInfo('Successfully exported the workspace to ' + remoteWorkspace.config.name + ' on ' + this.privateCloudUrl);
    this.hide();
  }

  /**
   * Notify user about the error.
   * @param error the error message to display
   */
  handleError(error: any) {
    this.importInProgress = false;
    var message;
    if (error && error.data) {
      if (error.data.message) {
        message = error.data.message;
      } else {
        message = error.data;
      }
    } else if (error && error.config && error.config.url) {
      message = 'unable to connect to ' + error.config.url;
    }
    this.cheNotification.showError('Exporting workspace failed: ' + message);
    this.$log.error('error', message, error);
  }
}
