# Cursor AI Context System

This directory contains persistent context files that help AI assistants maintain long-term understanding of the DocAI project.

## Files

### `instruction_context.md` - Main Context File
The comprehensive source of truth for:
- Project identity and goals
- Design philosophy and coding patterns
- Architecture and tech stack
- Vibe rules and style guide
- Current state and focus areas
- AI interaction preferences

**When to use:** Read at the start of each AI-assisted session. Update after learning new patterns or making architectural decisions.

### `context_summary.txt` - Quick Reference
A condensed version highlighting:
- Core tech stack
- Essential patterns
- Key rules
- Quick code snippets

**When to use:** Fast context recall when the full file is too large for context window.

## Purpose

This system enables:
- ✅ **Context preservation** across sessions
- ✅ **Consistent code generation** aligned with project patterns
- ✅ **Style coherence** as the codebase evolves
- ✅ **Reduced "vibe drift"** in AI-generated code
- ✅ **Onboarding aid** for new AI assistants or team members

## Maintenance

### For AI Assistants
1. **Before coding:** Read `instruction_context.md`
2. **During development:** Reference patterns and rules
3. **After major changes:** Update relevant sections
4. **When uncertain:** Ask for clarification, then document the answer

### For Human Developers
- Review and approve AI updates to these files
- Update when introducing new patterns or architectural changes
- Use these files to communicate project conventions to AI assistants
- Commit changes with descriptive messages: "AI Context Update: [summary]"

## Version Control

These files **should be committed** to version control:
- They represent team knowledge and conventions
- They help maintain consistency across AI interactions
- They serve as living documentation of the project's evolution

## Advanced Usage

### Context Drift Audit
Periodically compare the context file against actual code to identify inconsistencies:
```bash
# Check if patterns documented match implementation
# Review recent PRs for new patterns not yet documented
```

### Context Evolution
The `instruction_context.md` includes a changelog section. Document significant updates:
- New architectural patterns
- Style clarifications
- Feature additions
- Technical debt decisions

---

*Created: 2025-10-05*  
*Part of the DocAI Persistent Instruction Context System*

