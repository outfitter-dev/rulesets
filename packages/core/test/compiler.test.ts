import { MixdownCompiler, compiler } from '../src/compiler';
import { CompilerConfig } from '../src/types';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('MixdownCompiler', () => {
  let compilerInstance: MixdownCompiler;
  const testConfig: CompilerConfig = {
    srcDir: '/test/src',
    outDir: '/test/out',
    preferMixExtension: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    compilerInstance = compiler.createCompiler(testConfig);
  });

  describe('isSourceRulesFile', () => {
    it('should identify .md files as source rules files', () => {
      expect(compilerInstance.isSourceRulesFile('/test/src/rules.md')).toBe(true);
    });

    it('should identify .mix.md files as source rules files', () => {
      expect(compilerInstance.isSourceRulesFile('/test/src/rules.mix.md')).toBe(true);
    });

    it('should reject other file extensions', () => {
      expect(compilerInstance.isSourceRulesFile('/test/src/rules.txt')).toBe(false);
      expect(compilerInstance.isSourceRulesFile('/test/src/rules.mixmd')).toBe(false);
      expect(compilerInstance.isSourceRulesFile('/test/src/rules')).toBe(false);
    });
  });

  describe('getPreferredExtension', () => {
    it('should return .mix.md when preferMixExtension is true', () => {
      const compiler = new MixdownCompiler({
        srcDir: '/test/src',
        outDir: '/test/out',
        preferMixExtension: true
      });
      expect(compiler.getPreferredExtension()).toBe('.mix.md');
    });

    it('should return .md when preferMixExtension is false', () => {
      const compiler = new MixdownCompiler({
        srcDir: '/test/src',
        outDir: '/test/out',
        preferMixExtension: false
      });
      expect(compiler.getPreferredExtension()).toBe('.md');
    });

    it('should default to .mix.md when preferMixExtension is not specified', () => {
      const compiler = new MixdownCompiler({
        srcDir: '/test/src',
        outDir: '/test/out'
      });
      expect(compiler.getPreferredExtension()).toBe('.mix.md');
    });
  });

  describe('findSourceRulesFiles', () => {
    it('should find both .md and .mix.md files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'rule1.md', isFile: () => true, isDirectory: () => false },
        { name: 'rule2.mix.md', isFile: () => true, isDirectory: () => false },
        { name: 'other.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
      ] as unknown as fs.Dirent[]);
      
      mockFs.readFileSync.mockImplementation((path) => {
        if (String(path).endsWith('rule1.md')) return 'Content of rule1';
        if (String(path).endsWith('rule2.mix.md')) return 'Content of rule2';
        return '';
      });
      
      // Mock empty subdir
      mockFs.readdirSync.mockImplementationOnce(() => [
        { name: 'rule1.md', isFile: () => true, isDirectory: () => false },
        { name: 'rule2.mix.md', isFile: () => true, isDirectory: () => false },
        { name: 'other.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
      ] as unknown as fs.Dirent[]).mockImplementationOnce(() => [] as unknown as fs.Dirent[]);

      const files = compilerInstance.findSourceRulesFiles();
      
      expect(files.length).toBe(2);
      expect(files[0].path).toContain('rule1.md');
      expect(files[0].extension).toBe('.md');
      expect(files[0].content).toBe('Content of rule1');
      
      expect(files[1].path).toContain('rule2.mix.md');
      expect(files[1].extension).toBe('.mix.md');
      expect(files[1].content).toBe('Content of rule2');
    });
    
    it('should skip directories that start with underscore', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'rule1.md', isFile: () => true, isDirectory: () => false },
        { name: '_mixins', isFile: () => false, isDirectory: () => true },
      ] as unknown as fs.Dirent[]);
      
      mockFs.readFileSync.mockImplementation((path) => {
        if (String(path).endsWith('rule1.md')) return 'Content of rule1';
        return '';
      });

      const files = compilerInstance.findSourceRulesFiles();
      
      expect(files.length).toBe(1);
      expect(files[0].path).toContain('rule1.md');
      expect(mockFs.readdirSync).toHaveBeenCalledTimes(1); // Should not traverse into _mixins
    });
  });

  describe('getOutputPath', () => {
    it('should maintain the same directory structure in output', () => {
      const sourceFile = {
        path: '/test/src/dir/subdir/rule.md',
        content: 'Test content',
        extension: '.md' as const
      };
      
      const outputPath = compilerInstance.getOutputPath(sourceFile);
      expect(outputPath).toBe('/test/out/dir/subdir/rule.md');
    });
    
    it('should allow changing the extension', () => {
      const sourceFile = {
        path: '/test/src/rule.md',
        content: 'Test content',
        extension: '.md' as const
      };
      
      const outputPath = compilerInstance.getOutputPath(sourceFile, '.mdc');
      expect(outputPath).toBe('/test/out/rule.mdc');
    });
  });
});