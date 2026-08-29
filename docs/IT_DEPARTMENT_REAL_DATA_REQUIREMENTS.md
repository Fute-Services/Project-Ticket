# IT Department: Real Data Requirements

Fute Services Project Ticket Portal, prepared to help move the IT dashboard from sample data to real data. 10 Aug 2026.

Right now everything shown on the IT dashboard (tickets, equipment records, data requests, approvals, and rendering status) is sample data that lives inside the website's code. Before any of it can reflect real work, the IT team needs to hand over some actual information, either as a simple spreadsheet or by connecting an existing system like Active Directory, Zoho, or Freshservice.

## 1. Employee and User Master Data

This comes first because every ticket, piece of equipment, and request is tied back to a specific employee.

| Field | What is needed | Why it matters |
|---|---|---|
| Employee ID | A unique ID for each employee, such as EMP-3001 | Used to link tickets and equipment to the right person |
| Full Name | Actual employee name | Shown as the ticket requester |
| Department | HR, IT, Sales, Production, Marketing, Branding, or Developers | Needed for routing and reports |
| Email and Login | The company email used to sign in | Required for logging in securely |
| Role | Employee, Coordinator, HR, IT, Founder, or Production | Controls what each person can access |
| Reporting Manager | Who this person reports to | Used for approval routing |

## 2. Real IT Ticket Data

The tickets currently on the dashboard are just samples. Real tickets need these fields filled in:

- Employee ID of whoever raised the ticket
- Username for the system or network account the issue relates to
- VPN number if the issue involves remote access
- Date and time the issue was reported
- Issue category, such as hardware, software, network, or access
- Priority level: low, medium, high, or urgent
- Status history showing when the status changed and who changed it

**Suggestion:** a simple Google Form or spreadsheet where the IT team logs new tickets works fine to start. Existing history can also be exported from a current ticketing tool like Freshdesk or Zoho if one is already in use.

## 3. Real Asset Management Data

Every laptop, desktop, monitor, printer, and other piece of IT hardware needs a record:

| Field | Detail |
|---|---|
| Asset ID or Tag Number | The company's own asset tag number |
| Asset Type | Laptop, desktop, monitor, printer, server, or network device |
| Assigned To | Which employee currently has it |
| Hard Disk or Storage | Capacity and type (SSD or HDD) |
| Components List | RAM, processor, graphics card, and other parts installed |
| Purchase Date | Used to track warranty periods |
| Status | In use, in repair, retired, or available |
| Change or Audit Log | What part changed, when, and who made the change |

## 4. Data Transfer and Server Request Data

The server list currently shown (Server 100, 121, 70, 50, 131) is just a sample. In real use, we need:

- The actual server names or IDs the company uses
- The real approver assigned to each server
- The priority rule that applies to each server
- The requester's contact number and a backup person's name

## 5. Approval Workflow Data

- Which approver handles which type of request, such as HR Manager, Founder, or Department Head
- Approval categories, such as data access, server access, budget, or hardware purchase
- Expected turnaround time, meaning how many days a request should take to approve or reject

## 6. Rendering Status Data

This is the data behind the IT dashboard's Rendering Status page, listed right below Reports and Logs. Production logs the render jobs (rendering is the process of turning finished project work into final output files), and IT only views them, so the same fields need to be accurate for both sides.

| Field | What is needed | Why it matters |
|---|---|---|
| Project Code | The real project code used by Production, such as an actual VFX or ad job code | Identifies which project a render job belongs to |
| Sequence Type | The real sequence categories Production actually works with | Used to group and filter render jobs correctly |
| Frame Range | The real frame numbers for each job, such as 100 to 300 | Used to calculate total frames rendered on the stat cards |
| Assigned Person | The real name of whoever is running that render | Shows accountability for each job |
| Date | The actual date the render job was logged | Needed for accurate reporting over time |
| Allocated Systems | The real number of machines assigned to that job | Used to calculate total allocated systems on the render farm |
| Status | Whether the job is rendering or completed, updated live by Production | Lets IT see current render farm load without asking Production directly |

**Suggestion:** since Production already updates this status as work happens, the render farm software or a shared log Production maintains can be the real source, instead of typing job details in twice.

## 7. Reports and Analytics

- Monthly ticket volume, and how many were resolved versus still pending, if historical data is available
- Current total asset inventory count, broken down by department
- Average turnaround time for data request approvals

## 8. Integration Options, If Available

| System | How it helps |
|---|---|
| Active Directory or Google Workspace | Keeps employee master data and login details in sync |
| Freshservice, Zoho Desk, or Jira Service Management | Lets us import real ticket history |
| Excel or Google Sheets | The simplest option if no dedicated system is in place yet |

## Summary: What to Send First

1. The employee master list, with name, ID, department, and email
2. The list of current open or pending IT tickets, if one is being maintained anywhere
3. The IT asset inventory list, covering laptops and desktops currently assigned
4. The list of servers used for data requests, along with their real approvers
5. The current render farm job list from Production, with project codes, frame ranges, and assigned people

Once these items are available, the sample data can start being replaced with real data.

Fute Services Project Ticket Portal, IT Department Data Requirements Document.
