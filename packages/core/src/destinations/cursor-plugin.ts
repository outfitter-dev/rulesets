// TLDR: Stub destination plugin for Cursor (mixd-v0)
import { JSONSchema7 } from '../interfaces/destination-plugin';
import type { DestinationPlugin } from '../interfaces/destination-plugin';
import type { CompiledDoc } from '../interfaces/compiled-doc';
import type { Logger } from '../interfaces/logger';

export const cursorPlugin: DestinationPlugin = {
  get name() { return 'cursor'; },
  configSchema(): JSONSchema7 { return {}; },
  async write(ctx: { compiled: CompiledDoc; destPath: string; config: Record<string, any>; logger: Logger; }): Promise<void> {
    ctx.logger.info(`Writing Cursor output to ${ctx.destPath}`);
  }
};
