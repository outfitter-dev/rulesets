# Terminology Consolidation

**Goal:** Consolidate the terminology used across the Mixdown project to ensure consistency and clarity.

## Source Content

### Mix

- **Description:** The source files written in Mixdown notation
- **Current:** "Source rules files", "Source mix files", "Mix files"
- **Recommendation**: Pick one term and use it consistently.
- **Proposed:**
  1. "Mix files"
     - Reasoning: "Mix" is a term that is used in the Mixdown project to refer to the source files written in Mixdown notation. It is a more specific term that refers to the source files that are used to generate the target-specific rules files.
     - Example: "Mix files are written in 100% previewable Markdown"
  2. "Source rules"
     - Reasoning: "Source rules" can be a more descriptive term and maps more closely to the industry terminology of "rules."
     - Example: "Source rules files are written in 100% previewable Markdown"

## Target Terminology

### Target Tool

- **Description:** The AI assistant platform
- **Current:** "Target", "Tool", "Target provider"
- **Recommendation**: Distinguish between the tool itself and its configuration.
- **Proposed:**
  1. "Target tool" ← "Target", "Tool", "Target provider" (when referring to the actual tool)
     - Reasoning: "Target tool" clearly distinguishes the actual AI assistant platform from the configuration.
     - Example: "Cursor is a supported target tool"
  2. "Target" ← "Target" (when referring to configuration)
     - Reasoning: Keep as "Target" when referring to configuration for simplicity and consistency with existing terminology.
     - Example: "Each target defines specific criteria for compiling mixes"
  3. "Target platform" ← "Target", "Tool" (when emphasizing the platform aspect)
     - Reasoning: Emphasizes the platform nature of the target tool, useful when discussing technical integration aspects.
     - Example: "Mixdown supports multiple target platforms like Claude Code and Cursor"

## Output Terminology

### Rules Files

- **Description:** The generated artifacts from compilation
- **Current:** "Tool-specific rules files", "Target-specific rules files", "Per-tool rules files"
- **Recommendation**: Standardize on one term for consistency.
- **Proposed:**
  1. "Target-specific rules files" ← "Tool-specific rules files", "Target-specific rules files", "Per-tool rules files"
     - Reasoning: "Target-specific" directly ties the rules files to their intended target and maintains consistency with other target-related terminology.
     - Example: "Mixdown compiles mix files into target-specific rules files"
  2. "Compiled rules files" ← "Per-tool rules files"
     - Reasoning: Emphasizes the compiled nature of the files, focusing on the transformation process rather than the destination.
     - Example: "The compiler produces compiled rules files for each target tool"
  3. "Target rules" ← "Tool-specific rules files", "Target-specific rules files" (for brevity in appropriate contexts)
     - Reasoning: A simplified version that maintains the essential meaning while being more concise.
     - Example: "Each target rules file is placed in its appropriate tool directory"

### Tool-Ready Rules

- **Description:** Files placed in their respective tool directories
- **Current:** "Tool-ready rules", "Tool-ready output"
- **Recommendation**: Use consistent rules terminology.
- **Proposed:**
  1. "Tool-ready rules" ← "Tool-ready rules", "Tool-ready output"
     - Reasoning: This term clearly conveys that the rules are ready for use by their target tool and maintains consistency with our "rules" terminology.
     - Example: "When placed in their target tool directories, these are referred to as tool-ready rules"
  2. "Deployed rules" ← "Tool-ready output"
     - Reasoning: Emphasizes the deployment aspect of placing rules in their final destination.
     - Example: "The deployed rules are ready for the target tool to use"
  3. "Tool-installed rules" ← "Tool-ready rules", "Tool-ready output"
     - Reasoning: Clearly indicates that these rules have been placed in their tool-specific locations.
     - Example: "Tool-installed rules are automatically recognized by their respective target tools"

## Directory References

### Output Directory

- **Description:** The directory where compiled files are stored
- **Current:** ".mixdown/output/builds/", "Output location", "Output path"
- **Recommendation**: Consolidate language around specific use cases.
- **Proposed:**
  1. ".mixdown/output/ directory" ← ".mixdown/output/builds/"
     - Reasoning: Using the full path with directory suffix provides clarity and precision when referring to the output location.
     - Example: "Writes compiled rules files to the .mixdown/output/ directory"
  2. "Output directory" ← "Output location", "Output path"
     - Reasoning: A simpler alternative for contexts where the full path isn't necessary.
     - Example: "The output directory contains all target-specific rules files"

## Process Terminology

### Compile

- **Description:** The process of transforming mix files into target-specific rules files
- **Current:** "Generate", "Transform", "Process", "Compile"
- **Recommendation**: Use a single term for the transformation process.
- **Proposed:**
  1. "Compile" ← "Generate", "Transform", "Process", "Compile"
     - Reasoning: "Compile" best represents the transformation process and aligns with standard programming terminology for converting source code to output formats.
     - Example: "Mixdown compiles mix files into target-specific rules files"
  2. "Render" ← "Generate", "Transform" (alternative for UI/visual contexts)
     - Reasoning: In some contexts, especially when discussing the visual representation aspect, "render" may be more intuitive.
     - Example: "Mixdown renders mix files into their appropriate target formats"
  3. "Build" ← "Generate", "Process" (alternative for build-system contexts)
     - Reasoning: When discussing the build pipeline or integration with other build systems, "build" provides familiar terminology.
     - Example: "The build process automatically builds all mix files into their target formats"

### Compiler

- **Description:** The tool that performs compilation
- **Current:** "Rules compiler", "Prompt compiler"
- **Recommendation**: Standardize on rules terminology.
- **Proposed:**
  1. "Rules compiler" ← "Rules compiler", "Prompt compiler"
     - Reasoning: Directly connects to our standardized "rules" terminology and clearly communicates the tool's purpose.
     - Example: "Mixdown is a rules compiler for AI assistants"
  2. "Mixdown compiler" ← "Prompt compiler"
     - Reasoning: Uses the product name directly, which can be useful in specific contexts where the brand identity should be emphasized.
     - Example: "The Mixdown compiler transforms your mix files into target-specific rules"
  3. "Rules processor" ← "Rules compiler", "Prompt compiler"
     - Reasoning: Alternative for contexts where "compilation" might imply a more complex transformation than what actually occurs.
     - Example: "The rules processor handles the transformation of mix files into their final format"
