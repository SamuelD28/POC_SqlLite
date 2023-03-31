import { BindParams } from "sql.js";

export type PromiseCallbacks = {
  resolve: (value: any) => void;
  reject: (error: any) => void;
};

// Events
export type BaseEvent = {
  id: string;
};

export type ErrorEvent = BaseEvent & {
  error: string;
};

export type OpenEvent = BaseEvent & {
  ready: boolean;
};

export type ExecEvent = BaseEvent & {
  results: Result[];
};

export type EachEvent = BaseEvent & {
  row: any;
  finished: boolean;
};

export type DoneEvent = BaseEvent & {
  finished: boolean;
};

export type Result = {
  columns: string[];
  values: any[][];
};

export type ExportEvent = BaseEvent & {
  buffer: Uint8Array;
};

// Messages
export type BaseMessage = {
  id: string;
  action: "open" | "exec" | "export" | "each" | "close";
};

export type ExecMessage = BaseMessage & {
  sql: string;
  params?: BindParams;
  action: "exec";
};

export type EachMessage = BaseMessage & {
  sql: string;
  params?: BindParams;
  action: "each";
};

export type OpenMessage = BaseMessage & {
  buffer: Uint8Array;
  action: "open";
};

export type CloseMessage = BaseMessage & {
  action: "close";
};

export type ExportMessage = BaseMessage & { action: "export" };
