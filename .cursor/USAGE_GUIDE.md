# Persistent Instruction Context System - Usage Guide

## 🚀 Quick Start for AI Assistants

### At the Start of Each Session
```
1. Read .cursor/instruction_context.md (full context)
   OR
   Read .cursor/context_summary.txt (quick reference)

2. Reference the context while coding
3. Update after learning new patterns
```

### Example Workflow
```
User: "Add a new 'comments' feature to documents"

AI:
1. ✅ Read instruction_context.md
2. ✅ Follow service layer pattern: models → schemas → exceptions → services → api
3. ✅ Add permission checks in services
4. ✅ Use SWR for frontend data fetching
5. ✅ Update context with any new patterns discovered
```

---

## 📋 For Human Developers

### When to Update Context Files

**Update `instruction_context.md` when:**
- Adding new architectural patterns
- Establishing new coding conventions
- Introducing new dependencies or frameworks
- Making style or design decisions
- Identifying technical debt or known issues
- Completing major features

**Example Update:**
```markdown
## Changelog

### 2025-10-06 - Comments Feature
- Added Comment model with nested replies pattern
- Established real-time updates using WebSockets
- Updated service layer to handle comment threads
```

### Working with AI Assistants

**Tell the AI to:**
```
"Follow the patterns in .cursor/instruction_context.md"
"Update the context file with the new pattern we just established"
"Check the vibe rules before generating this component"
```

**Review AI Updates:**
- AI may update context after learning new patterns
- Review these updates in PRs like any other code change
- Ensure updates align with team conventions

---

## 🛠️ Maintenance Tasks

### Weekly
- [ ] Review recent PRs for new patterns not yet documented
- [ ] Check if context file aligns with actual codebase

### Monthly
- [ ] Perform context drift audit
- [ ] Update "Current State" section
- [ ] Review and consolidate changelog

### When Onboarding New Team Members
- [ ] Share `.cursor/instruction_context.md` as project guide
- [ ] Explain the AI context system
- [ ] Demonstrate how to request AI follow patterns

---

## 🎯 Context Update Templates

### Adding a New Pattern
```markdown
## [Section] (e.g., Vibe Rules)

### [Pattern Name]
**When to use:** [Description]
**Example:**
\`\`\`[language]
[code example]
\`\`\`

**Changelog:**
- YYYY-MM-DD: Added [pattern name] for [reason]
```

### Documenting Technical Debt
```markdown
## Known Design Tensions

- **[Issue Name]:** [Description]
  - Impact: [What's affected]
  - Reason: [Why it exists]
  - Future plan: [How to address]
```

### Recording Major Changes
```markdown
## Changelog

### YYYY-MM-DD - [Feature/Change Name]
- [What changed]
- [Why it changed]
- [Impact on codebase patterns]
```

---

## 💡 Advanced Techniques

### Context Scoping
For large codebases, create sub-context files:
```
.cursor/
  instruction_context.md       # Main context
  context_backend.md           # Backend-specific patterns
  context_frontend.md          # Frontend-specific patterns
  context_ai_features.md       # AI module patterns
```

### AI Prompts Library
Add common prompts to context:
```markdown
## AI Prompt Templates

### Adding CRUD Feature
"Create a new [entity] feature following the DocAI service pattern.
Include: models, schemas, exceptions, services, API routes, and frontend components."

### Debugging Permission Issues
"Check permission flow in [feature]. Verify checks exist in service layer,
not API routes. Follow the Doc/DocUser permission pattern."
```

### Context Validation
Create a script to validate context:
```bash
# Check if documented patterns exist in codebase
# Flag deviations from style guide
# Generate drift report
```

---

## ❓ FAQ

**Q: Should we commit these files?**  
A: Yes! These are living documentation and team knowledge.

**Q: What if AI updates get out of hand?**  
A: Review AI updates in PRs. Treat context files like code.

**Q: How detailed should updates be?**  
A: Document patterns, not every code change. Focus on "how we do things."

**Q: Can we have multiple context files?**  
A: Yes, for large projects consider splitting by domain.

**Q: How do we handle conflicts?**  
A: Resolve like any merge conflict. Favor recent team decisions.

---

## 🎨 Example AI Session

```
# Session Start
AI: *Reads instruction_context.md*
AI: Ready to code DocAI following established patterns.

User: Add a tag system for documents

AI: I'll follow the service layer pattern:
1. Create Tag model with many-to-many to Doc
2. Create TagSchema (Pydantic)
3. Add tag_services.py with business logic
4. Add tag API routes with user_required auth
5. Add frontend components using SWR
6. Update context with tag patterns

*After implementation*

AI: I've added the tag feature. I'll now update instruction_context.md
to document the many-to-many pattern we used...

# Context Updated
Section: Core Architecture
Added: Tag system using Django M2M with through model
```

---

**Remember:** This system works best when both humans and AI actively maintain it. Treat these files as your project's "memory" - keep them accurate, evolve them thoughtfully, and reference them often.

---

*Part of DocAI Persistent Instruction Context System*  
*Created: 2025-10-05*

