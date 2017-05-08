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

export interface ICommunicationClient {
  onResponse: Function;
  connect(entrypoint: string): ng.IPromise<any>;
  disconnect(): void;
  send(data: any): void;
  getDeferred(): ng.IDeferred<any>;
}

interface IRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any;
}

interface IResponse {
  jsonrpc: string;
  id: string;
  result?: any;
  error?: IError;
}

interface INotification {
  jsonrpc: string;
  method: string;
  params: any;
}

interface IError {
  number: number;
  message: string;
  data?: any;
}

/**
 * This client is handling the JSON RPC requests, responses and notifications.
 *
 * @author Ann Shumilova
 */
export class JsonRpcClient {
  private client: ICommunicationClient;

  private pendingRequests: Map<string, ng.IDeferred<any>>;
  private notificationHandlers: Map<string, Array<Function>>;
  private counter: number = 100;

  constructor (client: ICommunicationClient) {
    this.client = client;
    this.pendingRequests = new Map<string, ng.IDeferred<any>>();
    this.notificationHandlers = new Map<string, Array<Function>>();

    this.client.onResponse = (message: any): void => {
      this.processResponse(message);
    };
  }

  request(method: string, params?: any): ng.IPromise<any> {
    let deferred = this.client.getDeferred();
    let id = this.counter++;
    this.pendingRequests.set(id, deferred);

    let request: IRequest = {
      jsonrpc: '2.0',
      id: id,
      method: method,
      params: params
    };

    this.client.send(request);
  }

  notify(method: string, params?: any): void {
    let request: INotification = {
      jsonrpc: '2.0',
      method: method,
      params: params
    };

    this.client.send(request);
  }

  public addNotificationHandler(method: string, handler: Function): void {
    let handlers = this.notificationHandlers.get(method);

    if (handlers) {
      handlers.push(handler);
    } else {
      handlers = [handler];
      this.notificationHandlers.set(method, handlers);
    }
  }

  public removeNotificationHandler(method: string, handler: Function): void {
    let handlers = this.notificationHandlers.get(method);

    if (handlers) {
      handlers.splice(handlers.indexOf(handler), 1);
    }
  }

  private processResponse(message: any): void {
    alert(message);
  }
}
