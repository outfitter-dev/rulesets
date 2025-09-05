import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { ProjectDetector, type DetectionResult } from "../../src/detection/project-detector";

describe("ProjectDetector", () => {
  let testDir: string;
  
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "detector-test-"));
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("File Detection", () => {
    it("should detect package.json files", async () => {
      const packageJson = {
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "react": "^18.0.0",
          "@types/react": "^18.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedFiles).toContain("package.json");
      expect(result.projectType).toContain("node");
    });
    
    it("should detect cargo.toml files", async () => {
      const cargoToml = `
[package]
name = "test-project"
version = "0.1.0"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = "1.0"
`;
      
      await writeFile(join(testDir, "Cargo.toml"), cargoToml);
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedFiles).toContain("Cargo.toml");
      expect(result.projectType).toContain("rust");
    });
    
    it("should detect requirements.txt files", async () => {
      const requirements = `
django==4.2.0
numpy>=1.24.0
pandas~=2.0.0
`;
      
      await writeFile(join(testDir, "requirements.txt"), requirements);
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedFiles).toContain("requirements.txt");
      expect(result.projectType).toContain("python");
    });
    
    it("should detect docker files", async () => {
      const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
`;
      
      await writeFile(join(testDir, "Dockerfile"), dockerfile);
      await writeFile(join(testDir, "docker-compose.yml"), "version: '3'");
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedFiles).toContain("Dockerfile");
      expect(result.detectedFiles).toContain("docker-compose.yml");
      expect(result.suggestedSets).toContain("docker");
    });
    
    it("should detect GitHub workflows", async () => {
      await mkdir(join(testDir, ".github", "workflows"), { recursive: true });
      await writeFile(
        join(testDir, ".github", "workflows", "ci.yml"),
        "name: CI"
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedFiles).toContain(".github/workflows/ci.yml");
      expect(result.suggestedSets).toContain("github-actions");
    });
  });
  
  describe("Dependency Parsing", () => {
    it("should parse TypeScript dependencies from package.json", async () => {
      const packageJson = {
        name: "test-project",
        devDependencies: {
          "typescript": "^5.0.0",
          "@types/node": "^20.0.0",
          "vitest": "^1.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedDependencies).toContain("typescript");
      expect(result.detectedDependencies).toContain("vitest");
      expect(result.suggestedSets).toContain("typescript");
      expect(result.suggestedSets).toContain("testing-vitest");
    });
    
    it("should parse React dependencies", async () => {
      const packageJson = {
        dependencies: {
          "react": "^18.0.0",
          "react-dom": "^18.0.0",
          "next": "^14.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.suggestedSets).toContain("react");
      expect(result.suggestedSets).toContain("next");
    });
    
    it("should parse Rust dependencies from Cargo.toml", async () => {
      const cargoToml = `
[package]
name = "test"

[dependencies]
tokio = { version = "1", features = ["full"] }
axum = "0.6"
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
`;
      
      await writeFile(join(testDir, "Cargo.toml"), cargoToml);
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedDependencies).toContain("tokio");
      expect(result.detectedDependencies).toContain("axum");
      expect(result.suggestedSets).toContain("async-rust");
      expect(result.suggestedSets).toContain("rust-web");
    });
    
    it("should parse Python dependencies from requirements.txt", async () => {
      const requirements = `
django==4.2.0
flask>=2.3.0
fastapi~=0.100.0
pytest==7.4.0
black
`;
      
      await writeFile(join(testDir, "requirements.txt"), requirements);
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.detectedDependencies).toContain("django");
      expect(result.detectedDependencies).toContain("flask");
      expect(result.detectedDependencies).toContain("fastapi");
      expect(result.suggestedSets).toContain("python-web");
      expect(result.suggestedSets).toContain("testing-pytest");
    });
  });
  
  describe("Confidence Scoring", () => {
    it("should assign high confidence for exact matches", async () => {
      const packageJson = {
        dependencies: {
          "react": "^18.0.0",
          "@types/react": "^18.0.0"
        },
        devDependencies: {
          "typescript": "^5.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      const typescriptSuggestion = result.suggestions.find(s => s.set === "typescript");
      const reactSuggestion = result.suggestions.find(s => s.set === "react");
      
      expect(typescriptSuggestion?.confidence).toBeGreaterThanOrEqual(0.9);
      expect(reactSuggestion?.confidence).toBeGreaterThanOrEqual(0.9);
    });
    
    it("should assign medium confidence for partial matches", async () => {
      const packageJson = {
        dependencies: {
          "express": "^4.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      const nodeSuggestion = result.suggestions.find(s => s.set === "node");
      
      expect(nodeSuggestion?.confidence).toBeGreaterThanOrEqual(0.5);
      expect(nodeSuggestion?.confidence).toBeLessThan(0.9);
    });
    
    it("should provide reasons for suggestions", async () => {
      const packageJson = {
        dependencies: {
          "vue": "^3.0.0",
          "@vitejs/plugin-vue": "^4.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      const vueSuggestion = result.suggestions.find(s => s.set === "vue");
      
      expect(vueSuggestion?.reason).toContain("vue");
      expect(vueSuggestion?.reason).toMatch(/detected|found|package\.json/i);
    });
  });
  
  describe("Multiple File Types", () => {
    it("should handle projects with multiple languages", async () => {
      // TypeScript/Node
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify({ dependencies: { express: "^4.0.0" } })
      );
      
      // Python
      await writeFile(
        join(testDir, "requirements.txt"),
        "flask==2.3.0"
      );
      
      // Docker
      await writeFile(
        join(testDir, "Dockerfile"),
        "FROM node:18"
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      expect(result.projectType).toContain("node");
      expect(result.projectType).toContain("python");
      expect(result.suggestedSets).toContain("docker");
      expect(result.suggestedSets).toContain("node");
      expect(result.suggestedSets).toContain("python-web");
    });
    
    it("should prioritize suggestions by relevance", async () => {
      const packageJson = {
        dependencies: {
          "react": "^18.0.0",
          "react-dom": "^18.0.0",
          "next": "^14.0.0",
          "tailwindcss": "^3.0.0",
          "@tanstack/react-query": "^5.0.0"
        },
        devDependencies: {
          "typescript": "^5.0.0",
          "vitest": "^1.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector();
      const result = await detector.detect(testDir);
      
      // Should be sorted by confidence/relevance
      expect(result.suggestedSets[0]).toMatch(/typescript|react|next/);
      expect(result.suggestedSets).toContain("tailwind");
      expect(result.suggestedSets).toContain("testing-vitest");
    });
  });
  
  describe("Configuration Integration", () => {
    it("should use detection patterns from config", async () => {
      const config = {
        detection: {
          patterns: {
            "package.json": ["typescript", "node"],
            "go.mod": ["go"],
            "build.gradle": ["java", "gradle"]
          },
          dependencies: {
            "@angular/core": ["angular"],
            "svelte": ["svelte"],
            "solid-js": ["solidjs"]
          }
        }
      };
      
      const packageJson = {
        dependencies: {
          "@angular/core": "^17.0.0"
        }
      };
      
      await writeFile(
        join(testDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      
      const detector = new ProjectDetector(config);
      const result = await detector.detect(testDir);
      
      expect(result.suggestedSets).toContain("angular");
      expect(result.suggestedSets).toContain("typescript");
      expect(result.suggestedSets).toContain("node");
    });
  });
});