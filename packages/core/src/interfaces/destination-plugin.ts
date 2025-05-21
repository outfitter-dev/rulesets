// TLDR: Defines the DestinationPlugin interface for output plugins (mixd-v0)
import type { JSONSchema7 } from 'json-schema';
import type { CompiledDoc } from './compiled-doc';
import type { Logger } from './logger';

export { JSONSchema7 };

export interface DestinationPlugin {
  get name(): string;
  configSchema(): JSONSchema7;
  write(ctx: { compiled: CompiledDoc; destPath: string; config: Record<string, any>; logger: Logger; }): Promise<void>;
}
