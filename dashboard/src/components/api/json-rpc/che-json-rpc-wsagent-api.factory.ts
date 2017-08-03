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
import {WebsocketClient} from './websocket-client';
import {CheJsonRpcApiClient, IChannel} from './che-json-rpc-api-service';
import {ICommunicationClient} from './json-rpc-client';

enum WsAgentChannels {
  IMPORT_PROJECT
}

const websocketWsAgentApi: string = '/websocket';
/**
 *
 *
 * @author Ann Shumilova
 */
export class CheJsonRpcWsagentApi {
  private cheJsonRpcApi: CheJsonRpcApiClient;
  private channels: Map<WsAgentChannels, IChannel>;

  constructor (client: ICommunicationClient) {
    this.cheJsonRpcApi = new CheJsonRpcApiClient(client);

    this.channels = new Map<WsAgentChannels, IChannel>();
    this.channels.set(WsAgentChannels.IMPORT_PROJECT, {
      subscription: 'importProject/subscribe',
      unsubscription: 'importProject/unSubscribe',
      notification: 'importProject/progress/'
    });
  }

  connect(entrypoint: string): ng.IPromise<any> {
    // let applicationID: number = new Date().getTime();
    let applicationID = '';
    return this.cheJsonRpcApi.connect(entrypoint + websocketWsAgentApi + applicationID);
  }

  subscribeProjectImport(projectName: string, callback: Function): void {
    let channel = this.channels.get(WsAgentChannels.IMPORT_PROJECT);
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification + projectName, callback);
  }

  unSubscribeProjectImport(projectName: string, callback: Function): void {
    let channel = this.channels.get(WsAgentChannels.IMPORT_PROJECT);
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification + projectName, callback);
  }
}
