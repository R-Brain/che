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
import {ICommunicationClient, JsonRpcClient} from './json-rpc-client';

export class IChannel {
  subscription: string;
  unsubscription: string;
  notification: string;
}

/**
 * Class for basic CHE API communication methods.
 *
 * @author Ann Shumilova
 */
export class CheJsonRpcApiClient {

  private jsonRpcClient: JsonRpcClient;

  constructor (client: ICommunicationClient) {
    this.jsonRpcClient = new JsonRpcClient(client);
  }

  subscribe(event: string, notification: string, handler: Function, params?: any): void {
    this.jsonRpcClient.addNotificationHandler(notification, handler);
    this.jsonRpcClient.notify(event, params);
  }

  unsubscribe(event: string, notification: string, handler: Function, params?: any): void {
    this.jsonRpcClient.removeNotificationHandler(event, handler);
    this.jsonRpcClient.notify(event);
  }
}
