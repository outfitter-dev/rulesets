# Claude Code Context Priming

<instructions>
The user would like to prime your context with the information listed below. Please read through the information carefully.
</instructions>

<context>

<overview_spec>
<file>mixdown/spec/overview.md</file>
<description>
  This is a draft overview of the project. It's still a work in progress, but should be considered canon for our work to be done.
</description>
<maintaining>
  Make sure that the language used in the overview
</overview_spec>

<language_spec>
<file>mixdown/spec/language.md</file>
<description>
  This is a draft language spec for the project. It's still a work in progress, but it's important to carefully follow the standards that it outlines.
</description>
<maintaining>
  It's important to keep the language spec up to date. As you work on the project, if there seems to be a gap in the spec, inform the user of any proposed changes and wait for their confirmation.

  If changes have been made more recently in other documents that aren't reflected in the language spec, update it.
</maintaining>
</language_spec>

<readme_md>
<file>README.md</file>
<description>
  This is the project's core README file.
</description>
<maintaining>
  Make sure that the language used in the README is consistent with the language spec.
</maintaining>
</readme_md>

<claude_md>
<file>CLAUDE.md</file>
<description>
  This is your project guidance file.
</description>
<startup_task>
  As you begin this session, be sure to check to see if anything in the overview or language spec has changed that would necessitate updating this file. If so, make the necessary changes.
</startup_task>
</claude_md>

</context>

<follow_up_task>
  After you've finished considering the above context, let the user know you're ready to begin. Summarize any changes you made to the context while priming, in a sequential list.
</follow_up_task>