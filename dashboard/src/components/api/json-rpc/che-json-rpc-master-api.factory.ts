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
import {CheJsonRpcApiClient, IChannel} from './che-json-rpc-api-service';
import {ICommunicationClient} from './json-rpc-client';

enum MasterChannels {
  ENVIRONMENT_OUTPUT, ENVIRONMENT_STATUS, WS_AGENT_OUTPUT, WORKSPACE_STATUS
}

const websocketMasterApi: string = '/wsmaster/websocket/';

/**
 *
 *
 * @author Ann Shumilova
 */
export class CheJsonRpcMasterApi {
  private cheJsonRpcApi: CheJsonRpcApiClient;
  private channels: Map<MasterChannels, IChannel>;

  constructor (client: ICommunicationClient) {
    this.cheJsonRpcApi = new CheJsonRpcApiClient(client);

    this.channels = new Map<MasterChannels, IChannel>();
    this.channels.set(MasterChannels.ENVIRONMENT_OUTPUT, {
      subscription: 'event:environment-output:subscribe-by-machine-name',
      unsubscription: 'event:environment-output:un-subscribe-by-machine-name',
      notification: 'event:environment-output:message'
    });

    this.channels.set(MasterChannels.ENVIRONMENT_STATUS, {
      subscription: 'event:environment-status:subscribe',
      unsubscription: 'event:environment-status:un-subscribe',
      notification: 'event:environment-status:changed'
    });

    this.channels.set(MasterChannels.WS_AGENT_OUTPUT, {
      subscription: 'event:ws-agent-output:subscribe',
      unsubscription: 'event:ws-agent-output:un-subscribe',
      notification: 'event:ws-agent-output:message'
    });

    this.channels.set(MasterChannels.WORKSPACE_STATUS, {
      subscription: 'event:workspace-status:subscribe',
      unsubscription: 'event:workspace-status:un-subscribe',
      notification: 'event:workspace-status:changed'
    });
  }

  connect(entrypoint: string): ng.IPromise<any> {
    let applicationID: number = new Date().getTime();
    return this.cheJsonRpcApi.connect(entrypoint + websocketMasterApi + applicationID);
  }

  subscribeEnvironmentOutput(workspaceId: string, machineName: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.ENVIRONMENT_OUTPUT);
    let params = [workspaceId + '::' + machineName];
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification, callback, params);
  }

  unSubscribeEnvironmentOutput(workspaceId: string, machineName: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.ENVIRONMENT_OUTPUT);
    let params = [workspaceId + '::' + machineName];
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification, callback, params);
  }

  subscribeEnvironmentStatus(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.ENVIRONMENT_STATUS);
    let params = [workspaceId];
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification, callback, params);
  }

  unSubscribeEnvironmentStatus(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.ENVIRONMENT_STATUS);
    let params = [workspaceId];
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification, callback, params);
  }

  subscribeWsAgentOutput(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.WS_AGENT_OUTPUT);
    let params = [workspaceId];
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification, callback, params);
  }

  unSubscribeWsAgentOutput(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.WS_AGENT_OUTPUT);
    let params = [workspaceId];
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification, callback, params);
  }

  subscribeWorkspaceStatus(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.WORKSPACE_STATUS);
    let params = [workspaceId];
    let statusHandler = (message) => {
      if (workspaceId === message.workspaceId) {
        callback(message);
      }
    }
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification, statusHandler, params);
  }

  unSubscribeWorkspaceStatus(workspaceId: string, callback: Function): void {
    let channel = this.channels.get(MasterChannels.WORKSPACE_STATUS);
    let params = [workspaceId];
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification, callback, params);
  }
}
