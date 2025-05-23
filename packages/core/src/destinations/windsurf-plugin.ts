// TLDR: Stub destination plugin for Windsurf (mixd-v0)
import { JSONSchema7 } from '../interfaces/destination-plugin';
import type { DestinationPlugin } from '../interfaces/destination-plugin';
import type { CompiledDoc } from '../interfaces/compiled-doc';
import type { Logger } from '../interfaces/logger';

export const windsurfPlugin: DestinationPlugin = {
  get name() { return 'windsurf'; },
  configSchema(): JSONSchema7 { return {}; },
  async write(ctx: { compiled: CompiledDoc; destPath: string; config: Record<string, any>; logger: Logger; }): Promise<void> {
    ctx.logger.info(`Writing Windsurf output to ${ctx.destPath}`);
  }
};
