import React, { ReactNode, useEffect, useRef, useState } from "react";
import { createContext, useContext } from "react";
import { BindParams, Database, Statement } from "sql.js";
import { Spinner, Alert } from "reactstrap";
import { get, set } from "idb-keyval";
import { v4 as uuid } from "uuid";
import { isErrorEvent } from "./helper";
import {
  BaseEvent,
  BaseMessage,
  CloseMessage,
  DoneEvent,
  EachEvent,
  EachMessage,
  ExecEvent,
  ExecMessage,
  ExportEvent,
  OpenEvent,
  OpenMessage,
  PromiseCallbacks,
} from "./types";

export type SqlLiteContext = {
  query: (sql: string, params?: BindParams) => Promise<ExecEvent>;
  insert: (sql: string, params?: BindParams) => Promise<ExecEvent>;
  each: (
    sql: string,
    cb: (row: any) => void,
    params?: BindParams
  ) => Promise<void>;
  close: () => Promise<BaseEvent>;
  open: () => Promise<OpenEvent>;
  exportDatabase: () => Promise<ExportEvent>;
  persistDatabase: () => Promise<void>;
  downloadDatabase: () => Promise<void>;
};

export type SqlLiteContextType = SqlLiteContext | undefined;

const Context = React.createContext<SqlLiteContextType>(undefined);

const worker = new Worker("/dist/worker.sql-wasm.js");

export const SqlLiteProvider = ({ children }: { children: ReactNode }) => {
  const [isInitiated, setIsInitiated] = useState(false);
  const promises = useRef<Record<string, PromiseCallbacks>>({});

  async function open() {
    const databaseContent = await get("database"); // Logic for storage could be extracted
    const message: OpenMessage = {
      id: uuid(),
      action: "open",
      buffer: databaseContent,
    };

    return await sendMessage<OpenEvent>(message);
  }

  function close() {
    const message: CloseMessage = {
      id: uuid(),
      action: "close",
    };
    return sendMessage<BaseEvent>(message);
  }

  function query(sql: string, params?: BindParams) {
    const message: ExecMessage = {
      id: uuid(),
      action: "exec",
      sql,
      params,
    };
    return sendMessage<ExecEvent>(message);
  }

  function insert(sql: string, params?: BindParams) {
    const message: ExecMessage = {
      id: uuid(),
      action: "exec",
      sql: `PRAGMA foreign_keys = ON; ${sql}`,
      params,
    };
    return sendMessage<ExecEvent>(message);
  }

  async function each(
    sql: string,
    cb: (row: any) => void,
    params?: BindParams
  ) {
    const messageId = uuid();
    const message: EachMessage = {
      id: messageId,
      action: "each",
      sql,
      params,
    };

    let eachEvent = await sendMessage<EachEvent & DoneEvent>(message);
    while (!eachEvent.finished) {
      // To investigate, im not sure if its rock solid to do this.
      cb(eachEvent.row);
      eachEvent = await new Promise<EachEvent & DoneEvent>(
        (resolve, reject) => {
          promises.current[messageId] = {
            resolve,
            reject,
          };
        }
      );
    }
  }

  function exportDatabase() {
    const message: BaseMessage = { id: uuid(), action: "export" };
    return sendMessage<ExportEvent>(message);
  }

  async function persistDatabase() {
    const { buffer } = await exportDatabase();
    return set("database", buffer); // Logic for storage could be extracted
  }

  async function downloadDatabase() {
    const { buffer } = await exportDatabase();
    const databaseFile = new Blob([buffer]);
    const a = document.createElement("a"),
      url = URL.createObjectURL(databaseFile);
    a.href = url;
    a.download = "database.sqlite3";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }

  function sendMessage<T>(message: BaseMessage) {
    return new Promise<T>(function (resolve, reject) {
      promises.current[message.id] = {
        resolve,
        reject,
      };
      worker.postMessage(message);
    });
  }

  function processResponse(message: MessageEvent<BaseEvent>) {
    const existingPromise = promises.current[message.data.id];

    if (!existingPromise) {
      return;
    }

    if (isErrorEvent(message.data)) {
      existingPromise.reject(message.data);
    } else {
      existingPromise.resolve(message.data);
    }

    delete promises.current[message.data.id];
  }

  useEffect(() => {
    worker.addEventListener("message", processResponse);
    open().finally(() => {
      setIsInitiated(true);
    });
  }, []);

  if (!isInitiated) {
    return (
      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Context.Provider
      value={{
        open,
        close,
        query,
        insert,
        each,
        persistDatabase,
        exportDatabase,
        downloadDatabase,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useSqlLiteProvider = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error(
      "Could not find a provider for sql lite. Make sure to add the provider to the tree"
    );
  }

  return context;
};
