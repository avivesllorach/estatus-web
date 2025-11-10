declare module 'net-snmp' {
  export enum Version {
    Version1 = 0,
    Version2c = 1,
    Version3 = 3
  }

  export interface SessionOptions {
    port?: number;
    retries?: number;
    timeout?: number;
    version?: Version;
  }

  export interface VarBind {
    oid: string;
    type: number;
    value: any;
  }

  export interface Session {
    get(oids: string[], callback: (error: Error | null, varbinds: VarBind[]) => void): void;
    close(): void;
  }

  export function createSession(target: string, community: string, options?: SessionOptions): Session;
  export function isVarbindError(varbind: VarBind): boolean;
  export function varbindError(varbind: VarBind): string;
}