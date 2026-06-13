// This file helps the IDE understand Deno globals without conflicting with existing types
declare namespace Deno {
  export function serve(handler: (req: any) => Promise<any> | any): void;
  export namespace env {
    export function get(key: string): string | undefined;
  }
}
