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

enum WsAgentChannels {
  IMPORT_PROJECT
}

/**
 *
 *
 * @author Ann Shumilova
 */
export class CheJsonRpcWsagentApi {
  private cheJsonRpcApi: CheJsonRpcApiClient;
  private channels: Map<WsAgentChannels, IChannel>;

  constructor ($websocket: ng.websocket.IWebSocketProvider, $q: ng.IQService) {
    let wsClient = new WebsocketClient($websocket, $q);
    this.cheJsonRpcApi = new CheJsonRpcApiClient(wsClient);

    this.channels = new Map<WsAgentChannels, IChannel>();
    this.channels.set(WsAgentChannels.IMPORT_PROJECT, {
      subscription: 'importProject/subscribe',
      unsubscription: 'importProject/unSubscribe',
      notification: 'importProject/progress'
    });
  }

  subscribeProjectImport(callback: Function): void {
    let channel = this.channels.get(WsAgentChannels.IMPORT_PROJECT);
    this.cheJsonRpcApi.subscribe(channel.subscription, channel.notification, callback);
  }

  unSubscribeProjectImport(callback: Function): void {
    let channel = this.channels.get(WsAgentChannels.IMPORT_PROJECT);
    this.cheJsonRpcApi.unsubscribe(channel.unsubscription, channel.notification, callback);
  }
}
