### FUTE PORTAL

# AI Department Agents + Founder Super Agent

*Complete Step-by-Step Implementation Blueprint*

> **What this document does**
>
> This guide starts from zero and walks through the full build in order. It explains what each part means, why you need it, what to build, how the parts connect, how to test them, and when to move to the next step. The goal is to avoid jumping directly into a complex Founder AI before the foundation is ready.

#### Product context

- Departments may include Sales, Development, HR, Design, IT, Architecture, Production, and more.

- Each department gets an AI assistant with only the data and actions it is allowed to use.

- Founder/Admin gets one Super Agent that can gather verified information across departments.

- Live operational answers come from your real database or APIs at question time.

- Policies, SOPs, architecture notes, and other documents are searched separately as company knowledge.

Version 1.0 | August 2026

## How to use this guide

Follow the sections in order. Do not start with the Founder Super Agent. First make one department agent work correctly, securely, and with live data. Then repeat the pattern for other departments. Only after that should you connect them to the Founder AI.

| Stage | What you finish | Do not move on until... |
| --- | --- | --- |
| 1. Foundation | Know your users, roles, departments, data and IDs | You can say exactly who can see which data. |
| 2. Tool layer | Safe backend functions for reading company data | Tools return correct live data without AI. |
| 3. First agent | Development AI works end-to-end | It answers real questions using tools, not guesses. |
| 4. More agents | Sales, HR, Design, IT, Architecture, Production | Each agent is isolated by permissions. |
| 5. Founder AI | Admin-only manager that combines departments | Cross-department answers are sourced and traceable. |
| 6. Production | Logs, tests, monitoring, cost controls | You can detect wrong answers and failed tool calls. |

### The one sentence to remember

> **Core rule**
>
> AI -> authorized tool -> real company data -> answer. The AI should not be the permanent storage place for your changing company data.

### Simple mental model

```text
Employee or Founder asks a question
->
AI understands what information is needed
->
Backend checks permission
->
AI calls approved department tools
->
Tools read the latest database / service data
->
AI explains the result in simple language
```

## 1. Understand the final system before coding

Your final product has three layers: people, AI agents, and company systems. The AI sits in the middle. It is not the database and it is not the permission system.

### What each department AI means

| Agent | Main job | Typical data |
| --- | --- | --- |
| Sales AI | Answer sales questions and summarize pipeline | Leads, deals, customers, follow-ups, revenue pipeline |
| Development AI | Answer engineering delivery questions | Projects, tickets, bugs, blockers, sprints, deployments |
| HR AI | Answer allowed people/process questions | Employees, leave, attendance, hiring, policies |
| Design AI | Answer design workflow questions | Requests, approvals, assets, design status |
| IT AI | Answer IT support and asset questions | Devices, incidents, access requests, service status |
| Architecture AI | Explain technical architecture and decisions | Systems, dependencies, ADRs, diagrams, standards |
| Production AI | Answer production and delivery questions | Jobs, stages, delays, delivery dates, quality status |
| Founder AI | Combine approved information across all departments | Calls the other agents/tools; admin-only |

### Important: you do not need eight different AI models

You can use the same model underneath. What changes is the role, instructions, allowed tools, allowed data, and permissions. Think of the same smart employee receiving a different job description and different system access.

> **Example**
>
> Development AI and Sales AI may use the same model, but Development AI receives development tools only, while Sales AI receives sales tools only.

## 2. Map your current product and data

Before adding AI, write down what already exists in your product. This prevents you from building an AI that does not know where the real information lives.

### Create a department inventory

| Department | Main screens/modules | Important records | Owner |
| --- | --- | --- | --- |
| Sales | Leads, CRM, follow-ups | Lead, Deal, Client, Activity | Sales manager |
| Development | Projects, tickets, bugs | Project, Ticket, Sprint, Bug | Engineering lead |
| HR | Employees, attendance, leave | Employee, Leave, Attendance | HR admin |
| Design | Requests, assets, approvals | DesignRequest, Asset, Approval | Design lead |
| IT | Support, access, devices | Incident, Device, AccessRequest | IT admin |
| Architecture | Architecture docs / decisions | System, ADR, Dependency | Architect |
| Production | Jobs, stages, delivery | Job, Stage, Delivery | Production lead |

### Write down where each fact comes from

For every question your AI should answer, identify the source of truth. If a fact exists in a database table, use that table. If it comes from GitHub, Jira, an ERP, Google Drive, or another system, the tool should call that system.

| Question | Source of truth | AI should use |
| --- | --- | --- |
| What tickets are overdue? | Ticket database | Ticket query tool |
| What is the sales pipeline? | CRM / deals table | Sales pipeline tool |
| Who is on leave today? | HR leave system | Leave query tool |
| What is our WFH policy? | HR policy document | Document search |
| Why is Project A delayed? | Several departments | Founder AI calls multiple tools |

### Your output from this step

- [ ] List of departments.

- [ ] List of important records/tables for each department.

- [ ] List of current external systems and APIs.

- [ ] List of important business questions you want AI to answer.

- [ ] Source of truth for every important question.

## 3. Create a common company data model

Cross-department AI becomes much easier when different departments can refer to the same project, client, employee, or ticket using stable IDs.

### Use shared IDs

#### Example stable IDs

> **Client:      CL-0021**
>
> Project:     PRJ-1024
> Employee:    EMP-0042
> Ticket:      TKT-5481
> Deal:        DEAL-0098
> Production:  JOB-0772

Then connect records to each other. For example, a sales deal and a development project can both point to the same client and project.

#### Cross-department relationship example

```text
Deal.project_id         = PRJ-1024
Ticket.project_id       = PRJ-1024
DesignRequest.project_id= PRJ-1024
ProductionJob.project_id= PRJ-1024
```

### Minimum entities to standardize

| Entity | Why it matters |
| --- | --- |
| User | Who is logged in and asking the AI. |
| Role | What the user is allowed to see/do. |
| Department | Which business area owns the record. |
| Employee | Links work, ownership and HR records. |
| Client | Connects sales and delivery work. |
| Project | Main cross-department work object. |
| Task/Ticket | Operational work item. |
| Activity/Audit Event | Who changed what and when. |

> **Do not redesign everything only for AI**
>
> If your current database already works, add clean IDs and relationships gradually. The goal is to make data easy to query and connect, not to rebuild your whole product.

## 4. Build authentication and permissions first

Permissions must be enforced by your backend. Hiding a Founder AI button in the frontend is not enough because a user could still try to call the API directly.

### Example roles

| Role | Allowed AI access |
| --- | --- |
| Developer | Development AI and permitted project data |
| Sales | Sales AI and permitted sales data |
| HR | HR AI and permitted HR data |
| Department Manager | Their department AI plus wider department scope |
| Admin | Approved administrative scope |
| Founder | Founder Super Agent with all explicitly approved company tools |

### Permission check flow

```text
User sends AI message
->
Backend validates login/session
->
Backend reads user role + department
->
Backend checks requested AI endpoint
->
Each tool checks permission again
->
Allowed: return data  |  Not allowed: reject
```

### Why check twice?

The first check protects the AI endpoint. The second check protects the actual data tool. Even if an AI makes a strange tool choice, the tool itself still refuses unauthorized access.

#### Conceptual backend check

```text
authorize(user, {
  roles: ["FOUNDER", "ADMIN"],
  permission: "hr.salary.read"
})

// If not allowed -> return 403 / permission denied
```

Sensitive HR rule: use explicit permissions for salary, personal contacts, leave/health notes and identity documents. Do not expose these fields to AI by default.

## 5. Create the AI Gateway

The AI Gateway is one backend layer that all AI requests pass through. It keeps AI logic out of random frontend pages and gives you one place for security, logging, cost controls and agent routing.

### Recommended request flow

```text
Frontend chat box
->
POST /api/ai/chat
->
AI Gateway: auth + role + rate limit + conversation
->
Choose department agent or Founder agent
->
Agent calls approved tools
->
Return answer + sources + freshness information
```

### Responsibilities of the gateway

- Verify the logged-in user.

- Load role, department, tenant/company and permissions.

- Choose which agent is allowed.

- Attach only the tools that user/agent may use.

- Store conversation IDs if you support chat history.

- Create an AI run/audit record.

- Apply rate limits and usage limits.

- Return safe errors when tools fail.

### Suggested API shape

#### Example request

```text
POST /api/ai/chat

Body:
{
  "message": "Why is Project Alpha delayed?",
  "conversationId": "optional-id",
  "agent": "founder"
}

Server decides whether this user is allowed to use agent="founder".
```

> **Never call the AI provider directly from the browser with a secret key**
>
> Your frontend should call your own backend. The backend keeps secrets, checks permissions and decides which tools can be used.

## 6. Build the Tool Layer

A tool is simply a safe backend function the AI can call. This is the most important technical layer because it connects natural-language questions to real company data.

### Start with read-only tools

At the beginning, let AI read information but not change business records. Read-only tools are much safer while you learn how your agents behave.

| Department | Good first tools |
| --- | --- |
| Development | getProject, getTickets, getBlockedTasks, getOverdueTasks, getSprintStatus |
| Sales | getClient, getDeals, getPipeline, getOverdueFollowups, getDealsAtRisk |
| HR | getEmployeeDirectory, getLeaveSummary, getTeamAvailability, searchHRPolicies |
| Design | getDesignRequests, getPendingApprovals, getProjectDesignStatus |
| IT | getOpenIncidents, getDeviceStatus, getAccessRequests |
| Architecture | searchArchitectureDocs, getProjectDependencies, getArchitectureDecisions |
| Production | getJobs, getDelayedJobs, getDeliveryStatus, getQualityIssues |

### A good tool has five parts

1. A clear name: get_overdue_development_tasks.

2. A clear description: what the tool returns and when to use it.

3. Small input parameters: projectId, date range, status, limit.

4. Permission checks before reading data.

5. Structured output that the AI can understand reliably.

#### Simple tool logic

```text
getOverdueTasks({ projectId })
  -> check user permission
  -> query tasks WHERE due_date < today AND status != completed
  -> return { count, tasks, retrievedAt }
```

### Tool response example

#### Structured output

```json
{
  "count": 2,
  "tasks": [
    {"id":"TKT-101","title":"Payment API","daysOverdue":3,"owner":"EMP-12"},
    {"id":"TKT-202","title":"QA fixes","daysOverdue":1,"owner":"EMP-31"}
  ],
  "retrievedAt":"2026-08-10T15:00:00+05:30"
}
```

## 7. Build Development AI first

Use one department as your pilot. Development is a good choice because tickets, projects, dates, owners and blockers are usually structured and easy to test.

### Step 7.1 - Pick 10 questions

- What development tasks are overdue?

- Which projects have blockers?

- Who owns Ticket TKT-5481?

- What changed on Project Alpha this week?

- Which sprint items are still open?

- How many critical bugs are unresolved?

- Which developers have blocked work?

- What is the current status of Project Alpha?

- What was completed today?

- Which tasks have no owner?

### Step 7.2 - Build tools before the agent

Test the tools directly with normal backend tests. For example, getOverdueTasks() should return the correct database records even when no AI is involved.

### Step 7.3 - Give the agent strict instructions

#### Example agent instructions

> **You are the Development AI for Fute Portal.**
>
> Rules:
> 1. Use development tools for current company facts.
> 2. Never invent ticket status, owner, dates or blockers.
> 3. If a tool cannot verify a fact, say it cannot be verified.
> 4. Do not access non-development tools.
> 5. Include useful IDs and updated-at times when available.

### Step 7.4 - Connect the chat UI

```text
Developer types: "What is blocked today?"
->
Development AI chooses getBlockedTasks()
->
Tool reads live DB
->
AI summarizes results
->
UI shows answer + source + updated time
```

### Definition of done for Development AI

- [ ] Answers the 10 test questions correctly.

- [ ] Uses live tools for current facts.

- [ ] Cannot access Sales/HR/Founder tools.

- [ ] Shows a useful error if data is unavailable.

## 8. Repeat the pattern for every department

Once Development AI works, do not invent a totally new architecture for Sales or HR. Reuse the same pattern: instructions + approved tools + permission scope + tests.

### Department agent template

#### Reusable agent definition

> **Department Agent**
>
> name
>   instructions
>   allowed tools
>   allowed permission scope
>   document knowledge scope
>   test questions
>   logging rules
>   error behavior

### Recommended order

1. Development AI - easiest pilot for structured operational data.

2. Sales AI - clients, leads, deals and follow-ups.

3. Production AI - delivery/status dependencies become useful for Founder AI.

4. Design AI - requests and approvals.

5. IT AI - support, incidents and internal assets.

6. Architecture AI - mostly documents + dependencies + decisions.

7. HR AI - build carefully because permissions and privacy are more sensitive.

### Do not copy every tool to every agent

Each agent should receive the smallest set of tools needed for its job. Smaller permission scope makes the system safer and makes agent behavior easier to understand.

> **Good isolation test**
>
> Log in as a Sales user and ask: "Tell me the salary of Employee 42." The Sales AI should not have a salary tool at all. Even if the model tries something unexpected, the backend should deny access.

## 9. Build the Founder Super Agent

Only build this after several department agents work reliably. The Founder AI is a manager. It receives a question, decides which departments are needed, asks them for verified information, and combines the results.

### Example: cross-department question

Founder asks: "Why is Project Alpha delayed and which client is affected?"

```text
Founder AI receives question
->
Development: get blockers + overdue tasks
->
Design: get pending approvals
->
Production: get delayed jobs / dependencies
->
Sales: get project client + commercial context
->
Founder AI combines verified results into one answer
```

### Founder AI rules

- Admin/founder access only.

- Never guess current company facts.

- Call relevant department tools for operational data.

- Do not call every department when only one is needed.

- If departments disagree, show the conflict instead of hiding it.

- Include source systems, record IDs, and freshness times when useful.

- Clearly say when a question cannot be verified.

### Example Founder answer format

#### Human-readable result

> **Project Alpha - Attention required**
>
> Main delay:
> - Backend API is 3 days overdue (Development, TKT-101).
>
> Additional dependency:
> - Final design approval is still pending (Design, DSR-44).
>
> Client impact:
> - Client ABC is linked to this project; delivery is now at risk (Sales).
>
> Production:
> - Production has not started because it is waiting for development.
>
> Data checked: 3:04 PM today.

## 10. Keep answers updated with live data

You do not need to retrain the AI every time a ticket or project changes. For changing operational data, the AI should query the source of truth when the user asks the question.

### Live data pattern

```text
Developer changes ticket status to COMPLETED
->
Database is updated immediately
->
Founder asks for ticket status later
->
AI calls getTicket(TKT-5481)
->
Tool returns the current row
->
AI says COMPLETED with retrieved time
```

### Add freshness metadata

Useful tool responses include retrievedAt, updatedAt, sourceSystem and record IDs. This helps both the AI and the user understand how current the answer is.

#### Freshness example

```json
{
  "sourceSystem": "fute_ticket_db",
  "recordId": "TKT-5481",
  "status": "COMPLETED",
  "updatedAt": "2026-08-10T14:58:31+05:30",
  "retrievedAt": "2026-08-10T15:05:02+05:30"
}
```

### When you do need synchronization

If some departments use external systems, you have two choices: call the external API live, or synchronize it into your database. Choose based on reliability, API limits, speed and how fresh the data must be.

| Data type | Recommended source |
| --- | --- |
| Tickets/projects inside Fute Portal | Query your database live. |
| CRM inside Fute Portal | Query your database live. |
| External service with reliable API | Tool can call the API or a synced copy. |
| Policies / SOPs / documents | Document indexing/search. |
| Analytics totals | Prefer precomputed metrics or safe aggregate queries for speed. |

## 11. Add document knowledge separately

Your database is best for live structured facts. Documents are different. Policies, SOPs, architecture notes, sales playbooks and manuals should be indexed so the AI can search the relevant passages.

### Examples of document knowledge

- Employee handbook and HR policies.

- Sales scripts and pricing/process documents.

- Development runbooks and technical standards.

- Architecture Decision Records (ADRs).

- Design guidelines and brand rules.

- Production SOPs and quality procedures.

### Document search flow

```text
Policy/document is created or updated
->
Document processor extracts text + metadata
->
Update searchable knowledge index
->
Agent searches only its permitted department collection
->
Answer includes document title / section reference
```

### Do not mix documents and live status

| Question | Use |
| --- | --- |
| What is our leave policy? | Document search |
| Is Rahul on leave today? | Live HR system |
| What is our deployment process? | Document search |
| Did Project Alpha deploy today? | Live deployment/project tool |

> **Simple rule**
>
> If the answer can change minute-to-minute or day-to-day, prefer a live tool. If the answer comes from written policy, procedure or documentation, use document search.

## 12. Handle conversation memory correctly

Chat history is useful for understanding references like "that project" or "the second client," but chat history must not become your source of truth for current company facts.

### Good use of conversation memory

#### Conversation context example

> **User: Show me the three delayed projects.**
>
> AI: Alpha, Beta, Gamma.
> User: Who owns the second one?
>
> The AI can understand "second one" = Beta, then query live data for Beta owner.

### Bad use of conversation memory

If the AI said yesterday that Project Beta was delayed, it should not repeat that old status today without checking. The project may already be complete.

### Recommended storage

| Store | Purpose |
| --- | --- |
| Conversation | Messages, user references, current chat context |
| Company database | Current operational truth |
| Document index | Company knowledge and policies |
| Audit log | What the AI/tool did and why |
| Analytics/metrics store | Aggregates and performance metrics |

## 13. Design for accuracy, not confidence

No AI system should be treated as automatically 100% correct. Your architecture should make wrong answers easier to prevent, detect and investigate.

### Rules that improve accuracy

1. Use tools for current facts instead of asking the model to remember them.

2. Return structured tool data with IDs, timestamps and clear field names.

3. Tell the agent not to invent missing company facts.

4. Show "I could not verify this" when no source is available.

5. Use narrow tools instead of unrestricted database access.

6. Test important questions repeatedly against known expected answers.

7. Log which tools and records contributed to the final answer.

### Handle conflicting data

Sometimes Sales may show one delivery date while Production shows another. The AI should not silently choose one. It should say that the systems disagree and show both sources.

#### Good conflict behavior

> **I found a conflict:**
>
> - Sales expected delivery: Aug 14
> - Production expected delivery: Aug 17
>
> Please confirm which system should be treated as authoritative for delivery dates.

### Add source chips in the UI

For important answers, display small source information such as Development DB, Sales CRM, HR Policy, retrieved time, and relevant record IDs. Users gain trust because they can verify the answer.

## 14. Add audit logs and tracing

When an answer is wrong, you need to know what happened. An AI audit log records the user question, selected agent, tools called, tool outputs/status, response, timing and errors.

### Recommended AI run table

| Field | Purpose |
| --- | --- |
| id | Unique AI run ID |
| user_id | Who asked |
| agent | development / sales / founder / etc. |
| question | Original user message |
| status | success / partial / failed |
| model | Model identifier used |
| started_at / finished_at | Latency tracking |
| response | Final response or stored reference |
| error | Failure information if any |

### Recommended tool call table

| Field | Purpose |
| --- | --- |
| ai_run_id | Links back to the AI request |
| tool_name | Which tool was called |
| department | Data domain |
| input | Safe/loggable tool inputs |
| status | success / denied / error |
| duration_ms | Performance |
| record_ids | Important records used, where appropriate |
| created_at | When it happened |

> **Privacy note**
>
> Do not blindly store every sensitive field returned by HR or other private tools in logs. Log enough to investigate behavior while minimizing sensitive content.

## 15. Design the user experience

The user should feel like they are asking a knowledgeable company assistant, but the UI should also make scope and sources clear.

### Department AI page

#### Simple department AI layout

```text
+------------------------------------------------------+
| Development AI                                       |
| Ask about projects, tickets, bugs and blockers       |
|                                                      |
| [ What is blocking Project Alpha?                 ]  |
|                                                      |
| Answer...                                             |
| Sources: TKT-101, TKT-122 | Updated 3:06 PM          |
+------------------------------------------------------+
```

### Founder AI page

#### Simple Founder AI layout

```text
+------------------------------------------------------+
| Fute Company Intelligence                            |
| Ask anything across approved company departments     |
|                                                      |
| [ Give me today's company health                ]  |
|                                                      |
| Suggested questions                                  |
| - Which projects are at risk?                        |
| - Which clients need attention?                      |
| - What is blocking delivery?                         |
| - What changed today across departments?             |
+------------------------------------------------------+
```

### Useful response features

- Department/source badges.

- Updated/retrieved time.

- Clickable project, ticket or client IDs.

- Clear permission/error messages.

- Copy/export for summaries.

- Feedback buttons: helpful / incorrect.

- Optional "show how this was calculated" for metrics.

## 16. Test every agent before trusting it

Do not test only by chatting randomly. Create a permanent evaluation set: known questions with known expected facts. Run them after every important agent or tool change.

### Four test categories

| Category | Example |
| --- | --- |
| Correct answer | "How many overdue dev tasks?" Expected: 7. |
| No data | Ask for a non-existent project; AI should say not found. |
| Permission | Sales user asks for HR salary data; request must be denied. |
| Cross-department | Founder asks why Project Alpha is delayed; verify all departments used correctly. |

### Create a test sheet for each agent

| Question | Expected tool(s) | Expected key facts | Pass? |
| --- | --- | --- | --- |
| What is blocked today? | getBlockedTasks | IDs + owners + blockers | [ ] |
| Status of PRJ-1024? | getProject | Correct current status | [ ] |
| What did we finish today? | getCompletedTasks | Correct date filter | [ ] |
| Who is on leave? | HR tool only | Must be denied for dev user | [ ] |

### Failure handling tests

- Database is temporarily unavailable.

- Tool times out.

- External API returns an error.

- User asks an ambiguous question.

- User asks for unauthorized data.

- No matching record exists.

- Two systems return conflicting data.

## 17. Add write actions only after read-only AI is stable

Eventually you may want AI to create tickets, update statuses, schedule follow-ups, approve requests or send messages. These are actions, not just answers, so they need stronger controls.

### Safe progression

1. Phase A: Read-only. AI can only retrieve and explain data.

2. Phase B: Draft actions. AI prepares a proposed change but does not execute it.

3. Phase C: Confirmed actions. User reviews and clicks Confirm before execution.

4. Phase D: Limited automation. Only low-risk, clearly defined actions can run automatically.

### Example confirmed action

```text
User: "Move TKT-101 to Done"
->
AI checks current ticket + permission
->
UI shows proposed change: In Progress -> Done
->
User confirms
->
Backend performs update
->
Audit event is stored
```

> **Do not let the model directly write arbitrary SQL**
>
> Business actions should use narrow, validated backend functions. This keeps permissions, validation and audit rules under your control.

## 18. Recommended project structure

Your exact folders depend on your stack. If your product uses a TypeScript/Next.js-style backend, this structure keeps agents, tools, permissions and prompts separate. The names are examples, not a requirement.

#### Example folder structure

```text
src/
  ai/
    gateway/
      chat-handler.ts
      router.ts
    agents/
      development.agent.ts
      sales.agent.ts
      hr.agent.ts
      design.agent.ts
      it.agent.ts
      architecture.agent.ts
      production.agent.ts
      founder.agent.ts
    tools/
      development/
      sales/
      hr/
      design/
      it/
      architecture/
      production/
    prompts/
    knowledge/
    evaluations/
    logging/
  auth/
    permissions.ts
    roles.ts
  services/
    database/
    crm/
    documents/
  api/
    ai/
      chat/
```

### Why separate these folders?

| Folder | Reason |
| --- | --- |
| agents | Agent role/instructions and which tools it receives. |
| tools | Real backend functions that read or change systems. |
| prompts | Reusable system instructions and policies. |
| auth | Permission checks independent of AI. |
| knowledge | Document ingestion/search logic. |
| evaluations | Permanent test questions and expected outcomes. |
| logging | AI run and tool-call trace storage. |

## 19. Example database additions

You do not need these exact names, but you will probably need records for permissions, AI conversations/runs and tool traces in addition to your normal business tables.

#### Conceptual table list

> **users**
>
> roles
> permissions
> user_roles
> role_permissions
>
> ai_conversations
> ai_messages
> ai_runs
> ai_tool_calls
>
> documents
> document_chunks_or_index_references
>
> projects
> clients
> tickets
> ...your existing business tables...

### Permission examples

#### Permission naming idea

```text
development.ticket.read
development.project.read
sales.pipeline.read
sales.client.read
hr.employee.directory.read
hr.salary.read
production.job.read
founder.ai.use
```

### Why permissions are better than only roles

Roles are simple labels such as Sales Manager or Founder. Permissions describe exact capabilities. This lets you change access without rewriting agent logic. For example, two Admin users can have different sensitive HR permissions.

## 20. Full end-to-end example

This example shows exactly what happens from the moment the founder types a question until the answer appears.

### Question

> **Founder asks**
>
> "Which projects are at risk this week, why are they at risk, and which clients are affected?"

### Behind the scenes

1. Frontend sends the message to /api/ai/chat.

2. AI Gateway verifies the session and confirms the user has founder.ai.use.

3. Gateway creates an ai_run record.

4. Founder Agent reads the question and decides that Development, Design, Production and Sales are relevant.

5. Development tools return overdue tasks and blockers by project.

6. Design tools return pending approvals by project.

7. Production tools return delayed jobs and dependency status.

8. Sales tools map the affected projects to clients/deals.

9. Each tool call is logged with status, timing and useful record IDs.

10. Founder Agent combines the results without inventing missing facts.

11. Backend stores the final run status.

12. Frontend displays the answer, source badges and retrieval time.

### What the user sees

#### Final answer example

> **3 projects need attention this week.**
>
> 1) Project Alpha - HIGH RISK
>    - Development: 2 blockers, including TKT-101 (3 days overdue)
>    - Design: DSR-44 approval pending
>    - Production: waiting for development
>    - Client: ABC Ltd
>
> 2) Project Beta - MEDIUM RISK
>    ...
>
> Sources checked: Development, Design, Production, Sales
> Retrieved: 3:08 PM

## 21. Implementation roadmap - do this in order

Below is the build order I recommend. Treat each phase as a gate. Finish and test the phase before moving forward.

| Phase | Goal |
| --- | --- |
| Phase 0 - Product/data audit | Map departments, users, roles, tables, external systems, important questions and sources of truth. |
| Phase 1 - Identity and permissions | Implement/clean up roles, permissions and backend authorization checks. |
| Phase 2 - AI Gateway | Create one secure backend entry point for AI chat, routing, logging and rate limits. |
| Phase 3 - Tool foundation | Create read-only Development tools and test them without AI. |
| Phase 4 - Development AI pilot | Connect Development Agent, chat UI, sources and 10-20 evaluation questions. |
| Phase 5 - More departments | Build Sales, Production, Design, IT, Architecture, then HR using the same pattern. |
| Phase 6 - Founder Super Agent | Give founder-only manager access to approved specialist agents/tools. |
| Phase 7 - Document knowledge | Index policies, SOPs and documentation with department metadata and permissions. |
| Phase 8 - Reliability | Add audit logs, traces, conflict handling, feedback, evaluation runs and alerting. |
| Phase 9 - Write actions | Only after read-only is stable, add confirmed ticket updates, approvals or other actions. |
| Phase 10 - Optimize | Improve latency, cost, caching, analytics, prompts and tool granularity based on usage. |

### Your very first coding milestone

> **Milestone #1**
>
> A logged-in developer asks "What development tasks are overdue?" The backend verifies access, the Development AI calls getOverdueTasks(), the tool reads the live database, and the UI shows the correct tasks with an updated time.

## 22. Production checklist

Use this checklist before calling the system ready for real company use.

### Security

- [ ] AI provider secrets are server-side only.

- [ ] Every AI endpoint checks authentication.

- [ ] Every tool checks permissions.

- [ ] Founder AI is backend-protected, not only hidden in UI.

- [ ] Sensitive HR/financial fields have explicit policies.

- [ ] Rate limits exist for users and/or company.

### Accuracy and data

- [ ] Current facts use live tools.

- [ ] Document questions use indexed company documents.

- [ ] Tool outputs include IDs and useful timestamps.

- [ ] Agents are instructed not to invent company facts.

- [ ] Conflicting data is shown clearly.

- [ ] Missing data produces a clear "cannot verify" response.

### Reliability and operations

- [ ] AI runs are logged.

- [ ] Tool calls are logged with safe metadata.

- [ ] Tool/API failures return useful errors.

- [ ] A permanent evaluation set exists for each agent.

- [ ] You track latency, failures and AI usage/cost.

- [ ] User feedback can mark incorrect answers.

### User experience

- [ ] Users know which department AI they are using.

- [ ] Founder AI clearly indicates cross-department sources.

- [ ] Record IDs are clickable where possible.

- [ ] Freshness/retrieved time is visible for live answers.

- [ ] Unauthorized requests explain that access is not available without leaking data.

## 23. Common mistakes to avoid

| Mistake | Better approach |
| --- | --- |
| Put the entire database into one huge prompt | Use tools to retrieve only relevant live data. |
| Build Founder AI first | Prove one department agent and tool pattern first. |
| Let AI decide permissions | Backend authorization decides permissions. |
| Give AI raw unrestricted SQL | Expose narrow validated tools. |
| Use vector search for every live fact | Use DB/API tools for structured changing data. |
| Trust a confident answer | Require sources, timestamps and evaluations. |
| Copy all tools into every agent | Use least-privilege tool sets. |
| Add write actions immediately | Start read-only, then confirmed actions. |
| Ignore logs | Store AI run and tool-call traces. |
| Use chat memory as truth | Re-check current facts from source systems. |

## 24. Simple glossary

| Term | Meaning in simple words |
| --- | --- |
| AI Agent | An AI with a job description and a limited set of tools. |
| Tool | A backend function the AI can call to get or change something. |
| Founder Super Agent | Admin-only AI that can coordinate several departments. |
| AI Gateway | Your backend entrance for all AI requests. |
| Source of Truth | The system that owns the real/current value. |
| RBAC | Role-based access control: who can access what. |
| Permission | A specific allowed capability, such as sales.pipeline.read. |
| RAG / Document Search | Searching relevant company documents before answering. |
| Vector Index | A search structure useful for finding semantically related document text. |
| Tool Call | One time the AI asks a backend function for information/action. |
| Evaluation | A repeatable test question with an expected result. |
| Audit Log | A history of who asked, what tools ran, and what happened. |
| Hallucination | When an AI generates a fact that was not actually verified. |
| Least Privilege | Give each user/agent only the minimum access needed. |

## 25. Final picture: what you are building

You are not building a single chatbot with all company data copied into it. You are building a secure company intelligence layer that can ask the correct systems for current information.

```text
FUTE PORTAL USERS
Employee -> Department AI    |    Founder/Admin -> Founder Super Agent
->
AI GATEWAY: authentication + permission + routing + logs
->
DEPARTMENT AGENTS: Sales | Development | HR | Design | IT | Architecture | Production
->
AUTHORIZED TOOLS
->
Live Databases / APIs     +     Company Document Knowledge
->
Verified answer with sources, IDs and freshness
```

### The build sequence in one line

> **Start small, then expand**
>
> Permissions -> AI Gateway -> Development tools -> Development AI -> more department agents -> Founder Super Agent -> document knowledge -> evaluations/logging -> carefully controlled actions.

### What success looks like

When this system is mature, a founder can ask a business question in normal language and receive a current, permission-safe, traceable answer that may combine Sales, Development, Design, Production, HR, IT and Architecture. A normal employee receives the same convenience, but only inside the data scope they are allowed to use.

### Your next practical task

Before writing the Founder AI, document your current Development module: tables/models, ticket fields, project fields, user roles and the exact backend function that can return overdue tasks. That becomes your first real tool and your first end-to-end AI milestone.

> **Core rule to keep forever**
>
> AI should explain and coordinate. Your backend should own permissions. Your database/services should own the facts.
