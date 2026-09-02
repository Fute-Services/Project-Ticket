import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Bot,
  Play,
  CheckCircle,
  Clock,
  Users,
  Cpu,
  FolderKanban,
  AlertTriangle,
  Check,
  RotateCcw,
  FileText,
  ChevronRight,
  Settings,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BadgeAlert,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTickets } from '../context/TicketContext';
import { useLeave } from '../context/LeaveContext';
import { useApprovals } from '../context/ApprovalContext';
import { useTaskProject } from '../context/TaskProjectContext';
import { useAuth } from '../context/AuthContext';
import { employees, candidates } from '../data/hrMockData';
import { tint } from '../styles/seriesColors';
import { callGeminiCabinet } from '../utils/aiCabinet';

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Local-simulation fallback for a typed question: no LLM call happens, so
// there's no way to actually answer free text. The closest honest behaviour
// is picking whichever canned script best matches the question's topic,
// rather than always defaulting to the generic audit regardless of what was
// asked.
function detectLocalTemplateType(queryText) {
  const q = queryText.toLowerCase();
  if (/onboard|hiring|new (hire|role|joinee)/.test(q)) return 'onboard';
  if (/approv|bottleneck|pending|blocker|stuck/.test(q)) return 'bottlenecks';
  if (/infra|server|asset|warranty|uptime|maintenance/.test(q)) return 'infra';
  return 'audit';
}

export default function FounderAiAdvisorView({ onNavigate }) {
  const { user } = useAuth();
  
  // Connect to React Contexts for dynamic data
  const ticketContext = useTickets() || { tickets: [] };
  const leaveContext = useLeave() || { leaveRequests: [], decide: () => {} };
  const approvalContext = useApprovals() || { approvals: [], decide: () => {} };
  const taskProjectContext = useTaskProject() || { tasks: [], projects: [], toggleComplete: () => {} };

  const { tickets } = ticketContext;
  const { leaveRequests } = leaveContext;
  const { approvals } = approvalContext;
  const { tasks, projects } = taskProjectContext;

  // App settings for LLM API config
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('fs_gemini_key') || '');
  const [modelName, setModelName] = useState(() => localStorage.getItem('fs_gemini_model') || 'gemini-2.5-flash');
  const [useRealApi, setUseRealApi] = useState(() => localStorage.getItem('fs_use_real_api') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dashboard AI state
  const [prompt, setPrompt] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typingAgent, setTypingAgent] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportTab, setReportTab] = useState('summary');
  const [activePromptType, setActivePromptType] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingAgent]);

  // Compute live dashboard stats
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress');
  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending');
  const pendingApprovals = approvals.filter(a => a.status === 'pending_founder');
  
  // Calculate average project progress
  const totalProjects = projects.length;
  const avgProjectProgress = totalProjects > 0 
    ? Math.round(projects.reduce((acc, curr) => acc + curr.progress, 0) / totalProjects)
    : 0;

  // Calculate task metrics
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTasks = tasks.length;
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Identify slowest project
  const slowestProject = totalProjects > 0 
    ? [...projects].sort((a, b) => a.progress - b.progress)[0] 
    : null;

  // Active candidates count
  const activeCandidates = candidates.filter(c => c.stage !== 'Rejected' && c.stage !== 'Joined').length;

  // Expiring warranty assets mock simulation
  const expiringAssetsCount = 2; // Simulated warning

  // Pre-configured query templates
  const templates = [
    {
      id: 'audit',
      label: 'Full Status Audit',
      prompt: 'What is the current status of all departments and pending blockers?',
      description: 'Audit HR, IT, and Project boards for a complete health report.'
    },
    {
      id: 'onboard',
      label: 'Recruitment & Onboarding',
      prompt: 'Prepare a plan to onboard 5 new developer roles next week.',
      description: 'Coordinate seat allocation, laptop procurement, and training tasks.'
    },
    {
      id: 'bottlenecks',
      label: 'Approvals & Bottlenecks',
      prompt: 'Check pending approvals and identify what is holding up operations.',
      description: 'List leaves, IT requests, and delayed tasks needing executive action.'
    },
    {
      id: 'infra',
      label: 'IT & Infrastructure Status',
      prompt: 'Generate an infrastructure and maintenance status report.',
      description: 'Review SLA metrics, server data requests, and asset compliance.'
    }
  ];

  // AI Agent Personas
  const agents = {
    hr: {
      name: 'Payel (HR AI)',
      role: 'HR Executive Advisor',
      color: 'border-[#8B182C]/30 text-[#8B182C] bg-[#8B182C]/10 shadow-[#8B182C]/5',
      accent: '#8B182C',
      icon: Users,
    },
    it: {
      name: 'IT Desk AI',
      role: 'IT Service Specialist',
      color: 'border-[#671421]/30 text-[#671421] bg-[#671421]/10 shadow-[#671421]/5',
      accent: '#671421',
      icon: Cpu,
    },
    coordinator: {
      name: 'Project Planner AI',
      role: 'Operations Coordinator',
      color: 'border-[#360C13]/30 text-[#360C13] bg-[#360C13]/10 shadow-[#360C13]/5',
      accent: '#360C13',
      icon: FolderKanban,
    },
    employee: {
      name: 'Employee Rep AI',
      role: 'Staff Voice Liaison',
      color: 'border-[#6E5F61]/30 text-[#6E5F61] bg-[#6E5F61]/10 shadow-[#6E5F61]/5',
      accent: '#6E5F61',
      icon: MessageSquare,
    },
    founder: {
      name: 'Ratish (Founder AI)',
      role: 'Cabinet Chief of Staff',
      color: 'border-[#A76C76]/40 text-[#671421] bg-[#A76C76]/15 shadow-[#A76C76]/10',
      accent: '#A76C76',
      icon: Bot,
    }
  };

  // Generate dynamic Hinglish conversation based on live dashboard state
  const getSimulatedDialogue = (type, queryText) => {
    switch (type) {
      case 'onboard':
        return [
          {
            agent: 'hr',
            text: `Ji Founder! Engineering Onboarding ke liye active pipelines prepare hain. Abhi candidate list mein ${activeCandidates} open hiring loops hain. Product Designer Priya Nair ko 'Offer Sent' status hai aur hum unhe onboard karne ke liye ready hain. Agle hafte ke 5 roles ke liye recruitment screening and candidate interviews ready kar rahi hoon.`
          },
          {
            agent: 'it',
            text: `IT Support Desk aligned! Onboarding ke liye laptops allocate karne honge. Hamare inventory records show karte hain ki hardware ready hai, but client-facing credentials setup karne honge. Main ek 'New Employee Account Setup' approval request trigger kar raha hoon jo aapko 'Approvals' panel mein dikhegi. Founder, please use approve karein taaki accounts configure ho sakein.`
          },
          {
            agent: 'coordinator',
            text: `Operations team ready! Main Coordinator panel mein 'Developer Orientation & Environment Setup' name se naya project prepare kar raha hoon. Total tasks list ready hai, aur standard documentation setup process (git flow guidelines, database seeding) employees ko distribute karne ke liye assign kar diya hai.`
          },
          {
            agent: 'employee',
            text: `Staff opinion checklist: Naye engineers ke aane se pehle documentation verify kar lena chahiye. Sangeetha aur Kumar ne comment kiya hai ki README configurations outdated hain, unhe updates milne par setup fast ho jayega.`
          },
          {
            agent: 'founder',
            text: `Perfect alignment. Sabhi departments sync ho chuke hain. IT, procure laptops and configure email addresses. HR, finalize offers. Coordinator, update the setup guides on priority. Main complete onboarding action checklist ready kar raha hoon. Report generate ho gayi hai, aap check kar sakte hain.`
          }
        ];
      
      case 'bottlenecks':
        return [
          {
            agent: 'hr',
            text: `Founder, status checks complete. HR operations mein ${pendingLeaves.length > 0 ? `${pendingLeaves.length} leave requests pending` : 'koi urgent leaves pending nahi'} hain. Sangeetha KS ki Casual Leave approval ke liye waiting hai. Background logs check kar ke lagta hai unki absence se sprint impact nahi hoga, so you can safely sign off.`
          },
          {
            agent: 'it',
            text: `IT Desk check. We have ${pendingApprovals.length} pending founder approvals in IT center. ${pendingApprovals.length > 0 ? `Submited request: '${pendingApprovals[0].title}' is blocking setup.` : 'All approvals are currently clear.'} Hamare pass ${openTickets.length} open customer/staff tickets hain jo queue ko lag kar rahe hain, inko resolve karne ka mandate IT team ko de diya hai.`
          },
          {
            agent: 'coordinator',
            text: `Coordinator updates: Hamare coordinator board mein task progression ${taskProgressPct}% completed hai. Delayed tasks count highlight ho raha hai. Project '${slowestProject?.name || 'Main App'}' ka progress abhi ${slowestProject?.progress || 0}% par hai jo ki average se peeche chal raha hai. Resource redistribution key bottleneck hai.`
          },
          {
            agent: 'employee',
            text: `Ground updates: Team members waiting status mein hain. approvals clear na hone se hardware and server data transfers halt hain, isiliye tickets generate ho rahi hain. Leaves approvals clear hone par team planning better hogi.`
          },
          {
            agent: 'founder',
            text: `Understood, team. Leaves and IT approvals hum immediate action le kar clear kar rahe hain. Slowest project '${slowestProject?.name || 'Main App'}' ke tasks fast-track karne ke liye resources load kiye jayenge. Bottleneck report and action items list main ready kar raha hoon.`
          }
        ];

      case 'infra':
        return [
          {
            agent: 'it',
            text: `IT systems security and health review: Server uptime currently 99.98% hai. Assets desk database checked. Inventory and assets system normal state mein hai, except ${expiringAssetsCount} devices are approaching warranty end dates soon. Active data requests and data transfers in-progress status par hain.`
          },
          {
            agent: 'coordinator',
            text: `Coordinator alignment: Database upgrades aur environment integration tasks active hain. System Administrator Nesamanikandan coordinates server patch releases. Weekly task deployment scheduled hai.`
          },
          {
            agent: 'hr',
            text: `Infrastructure changes ke dauran developers weekend shifts work kar rahe hain, inki attendance tracker and compensatory offs auto-configured hain.`
          },
          {
            agent: 'employee',
            text: `VPN speed stable hai but data server transfer ke liye server access response delayed lag raha hai. Server migration logs resolve hone par developer productivity badhegi.`
          },
          {
            agent: 'founder',
            text: `Good status. IT team and DevOps coordinates to execute maintenance tasks on Sunday to avoid downtime. Expiring warranty assets report generate kar ke procurement queue mein set kar raha hoon.`
          }
        ];

      case 'audit':
      default:
        return [
          {
            agent: 'hr',
            text: `Jai Jinendra Founder! HR overview check kiya. Aaj ki Company Attendance rate 92% hai. Total active employees count ${employees.length} hai. Hamare recruitment pipeline mein ${activeCandidates} active candidates screening/interview phases mein hain. ${pendingLeaves.length > 0 ? `${pendingLeaves.length} leave request(s) approval ke liye pending` : 'Filhaal koi leave request pending nahi'} hai.`
          },
          {
            agent: 'it',
            text: `IT Support Desk status scan: Total open tickets queue mein ${openTickets.length} items hain. SLA compliance rate 94% par maintain hai. Approvals center mein ${pendingApprovals.length} requests Founder decision ke liye pending hain, including: '${pendingApprovals[0]?.title || 'System hardware purchase'}'.`
          },
          {
            agent: 'coordinator',
            text: `Operations update: Total ${totalProjects} active projects running hain. Average board progress ${avgProjectProgress}% chal raha hai. Coordinator tasks details display ${completedTasks} completed tasks out of ${totalTasks} (${taskProgressPct}% completion). Slowest project is '${slowestProject?.name || 'App Core'}' standing at ${slowestProject?.progress || 0}% progress.`
          },
          {
            agent: 'employee',
            text: `Team mood feedback check: General team mood stable aur progressive hai. IT hardware allocations aur leave requests ke approvals bottleneck ban rahe hain, inko resolve karne se developer throughput grow karega.`
          },
          {
            agent: 'founder',
            text: `Excellent. I have analyzed all department metrics. Dashboard overall health index is STABLE, but we have ${pendingApprovals.length + pendingLeaves.length} approvals holding up progress. Project '${slowestProject?.name}' requires immediate resource attention. Let me compile the full consolidated chitta report.`
          }
        ];
    }
  };

  // Snapshot of the live Context data, sized down to what the Cabinet
  // discussion actually needs - full employee/candidate rosters would bloat
  // every request for no benefit, since the dialogue only ever cites counts
  // and a handful of named examples.
  const buildDashboardContext = () => ({
    hr: {
      employeeCount: employees.length,
      pendingLeaves: pendingLeaves.map(l => ({ employee: l.employee, type: l.type, days: l.days, from: l.from, to: l.to })),
      activeCandidatesCount: activeCandidates,
    },
    it: {
      openTickets: openTickets.map(t => ({ token: t.token, title: t.title, user: t.user, dept: t.dept, status: t.status })),
      pendingApprovals: pendingApprovals.map(a => ({ title: a.title, requestedBy: a.requestedBy, priority: a.priority })),
      expiringAssetsCount,
    },
    projects: {
      count: totalProjects,
      averageProgress: avgProjectProgress,
      slowestProject: slowestProject ? { name: slowestProject.name, progress: slowestProject.progress } : null,
      taskProgressPct,
    },
  });

  // Both the local simulation and a real Gemini response resolve to the same
  // { agent, text }[] shape, so everything downstream - the typing animation,
  // skip-to-end, and the report trigger - is identical either way.
  const stepsQueueRef = useRef([]);
  const stepIndexRef = useRef(0);

  // The typing animation schedules its own setTimeout chain, so skipping (or
  // starting a new query before the old chain finishes) doesn't cancel the
  // timers already in flight - it only updates state and refs. Without this
  // token, a stale timer from a skipped or superseded run fires later, reads
  // the (by-then-reused) refs, and wrongly finishes whatever simulation is
  // currently running. Every run gets its own token; a callback whose token
  // no longer matches the current one is stale and no-ops instead of acting.
  const simulationTokenRef = useRef(0);

  // Launch a Cabinet discussion. With a real API key configured it asks
  // Gemini to actually answer the question live; otherwise (or if that call
  // fails) it falls back to the offline scripted dialogue.
  const handleQuery = async (type = 'audit') => {
    simulationTokenRef.current += 1;
    setActivePromptType(type);
    const selectedTemplate = templates.find(t => t.id === type);
    const queryText = (selectedTemplate ? selectedTemplate.prompt : prompt) || 'What is the current status of all departments?';

    setIsSimulating(true);
    setShowReport(false);
    setCurrentStep(0);
    setMessages([{ sender: 'user', text: queryText, timestamp: nowTime() }]);

    if (useRealApi) {
      if (!apiKey.trim()) {
        toast.warning('Add a Gemini API key in LLM Setup to use Cloud mode.', { description: 'Falling back to the local simulation for now.' });
      } else {
        try {
          const steps = await callGeminiCabinet({ apiKey, model: modelName, query: queryText, context: buildDashboardContext() });
          runSimulationSteps(steps);
          return;
        } catch (err) {
          toast.error('Cloud Gemini Cabinet unavailable.', { description: String(err.message || err).slice(0, 160) });
        }
      }
    }

    const steps = getSimulatedDialogue(type === 'custom' ? detectLocalTemplateType(queryText) : type, queryText);
    runSimulationSteps(steps);
  };

  const runSimulationSteps = (steps) => {
    const token = simulationTokenRef.current;
    stepsQueueRef.current = steps;
    stepIndexRef.current = 0;

    const triggerNextAgent = () => {
      if (simulationTokenRef.current !== token) return; // superseded or skipped - stale timer, do nothing
      const idx = stepIndexRef.current;
      if (idx < stepsQueueRef.current.length) {
        const step = stepsQueueRef.current[idx];
        setTypingAgent(step.agent);

        setTimeout(() => {
          if (simulationTokenRef.current !== token) return;
          setMessages(prev => [...prev, { sender: step.agent, text: step.text, timestamp: nowTime() }]);
          setTypingAgent(null);
          stepIndexRef.current += 1;
          triggerNextAgent();
        }, 2200); // realistic reading & typing pause
      } else {
        // Simulation finished
        setIsSimulating(false);
        setPrompt('');
        generateExecutiveReport();
      }
    };

    // Delay first agent response slightly
    setTimeout(triggerNextAgent, 1000);
  };

  // Skip simulation straight to report - flushes whatever's left in the same
  // queue that's mid-animation, rather than recomputing dialogue from scratch
  // (which could produce content that doesn't match what's already on screen,
  // especially for an AI-sourced or custom-query conversation).
  const handleSkip = () => {
    simulationTokenRef.current += 1; // invalidate the run's pending timers
    setIsSimulating(false);
    setTypingAgent(null);
    setPrompt('');

    const remaining = stepsQueueRef.current
      .slice(stepIndexRef.current)
      .map(s => ({ sender: s.agent, text: s.text, timestamp: nowTime() }));
    stepIndexRef.current = stepsQueueRef.current.length;

    setMessages(prev => [...prev, ...remaining]);
    generateExecutiveReport();
  };

  // Save Settings for Gemini
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('fs_gemini_key', apiKey);
    localStorage.setItem('fs_gemini_model', modelName);
    localStorage.setItem('fs_use_real_api', useRealApi.toString());
    setIsSettingsOpen(false);
  };

  // Build the compiled Executive Status Report Object
  const generateExecutiveReport = () => {
    const data = {
      timestamp: new Date().toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      summary: {
        healthIndex: pendingApprovals.length + pendingLeaves.length > 2 ? 'Warning' : 'Healthy',
        keyMetrics: [
          { label: 'Today Attendance', value: '92%', status: 'Present' },
          { label: 'Open IT Tickets', value: openTickets.length, status: openTickets.length > 2 ? 'Warning' : 'Low' },
          { label: 'Pending Approvals', value: pendingApprovals.length + pendingLeaves.length, status: (pendingApprovals.length + pendingLeaves.length) > 0 ? 'High' : 'Low' },
          { label: 'Project Completion', value: `${taskProgressPct}%`, status: 'Medium' }
        ],
        notableHighlights: [
          `Company overall department operations are running at normal SLA capacity.`,
          pendingLeaves.length > 0 
            ? `Critical Action Needed: ${pendingLeaves.length} employee leave requests are waiting for Founder signature.` 
            : `HR leaves are fully processed and up to date.`,
          pendingApprovals.length > 0 
            ? `Critical Action Needed: ${pendingApprovals.length} IT asset approvals are awaiting Founder sign-off.` 
            : `IT approval request queue is clear.`,
          slowestProject 
            ? `Project Planning Alert: '${slowestProject.name}' is running slowest at ${slowestProject.progress}% completion.` 
            : `All active projects are pacing normally.`
        ]
      },
      hr: {
        employeeCount: employees.length,
        attendanceRate: 92,
        activeLeaves: pendingLeaves.map(l => ({
          id: l.id,
          employee: l.employee,
          type: l.type,
          from: l.from,
          to: l.to,
          days: l.days,
          reason: l.reason
        })),
        recruitment: {
          openJobsCount: 4,
          pipelineCount: activeCandidates,
          latestCandidate: candidates[0]
        }
      },
      it: {
        openTicketsCount: openTickets.length,
        ticketsList: openTickets.map(t => ({
          id: t.id,
          token: t.token,
          title: t.title,
          user: t.user,
          dept: t.dept,
          status: t.status
        })),
        pendingApprovals: pendingApprovals.map(a => ({
          id: a.id,
          title: a.title,
          source: a.source,
          requestedBy: a.requestedBy || 'System',
          priority: a.priority
        })),
        infraUptime: '99.98%',
        warrantyWarnings: expiringAssetsCount
      },
      projects: {
        activeCount: projects.length,
        averageProgress: avgProjectProgress,
        slowProject: slowestProject,
        projectsList: projects.map(p => ({
          id: p.id,
          name: p.name,
          progress: p.progress,
          client: p.client,
          dueDate: p.dueDate,
          membersCount: p.members.length
        })),
        delayedTasks: tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          assignee: t.assignee || 'Unassigned',
          status: t.status,
          dueDate: t.dueDate || 'No Due Date'
        }))
      },
      actionPlan: [
        ...(pendingLeaves.map(l => ({
          id: `act-leave-${l.id}`,
          title: `Approve or reject leave request for ${l.employee} (${l.days} days Casual Leave)`,
          category: 'HR Decision',
          urgency: 'Medium',
          targetTab: 'approvals',
          actionLabel: 'Go to Approvals'
        }))),
        ...(pendingApprovals.map(a => ({
          id: `act-app-${a.id}`,
          title: `Sign off IT asset request: "${a.title}" from ${a.requestedBy || 'IT'}`,
          category: 'IT Procurement',
          urgency: 'High',
          targetTab: 'approvals',
          actionLabel: 'Go to Approvals'
        }))),
        ...(slowestProject && slowestProject.progress < 50 ? [{
          id: 'act-proj-nudge',
          title: `Nudge Project Coordinator to re-allocate engineering resources for delayed tasks in '${slowestProject.name}'`,
          category: 'Operations',
          urgency: 'Low',
          targetTab: 'projects',
          actionLabel: 'View Projects'
        }] : []),
        ...(tickets.some(t => t.status === 'Open') ? [{
          id: 'act-it-ticket',
          title: `Audit IT Support ticketing queue to clear ${openTickets.length} outstanding team requests`,
          category: 'IT Service',
          urgency: 'Medium',
          targetTab: 'it',
          actionLabel: 'Audit IT Hub'
        }] : [])
      ]
    };
    setReportData(data);
    setShowReport(true);
    setReportTab('summary');
  };

  return (
    <div className="w-full flex flex-col gap-6 relative">
      
      {/* Visual Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
        {/* Background ambient light decoration */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 via-[#A76C76]/5 to-transparent pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-[#360C13] flex items-center justify-center text-white shadow-lg border border-primary/20 shrink-0">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              AI Agent Command Room
              <span className="text-[10px] font-bold tracking-widest text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                Cabinet
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xl">
              Ask your virtual department AI agents to query the system status, talk to each other to resolve resource plans, and compile a comprehensive audit report ("chitta") for you.
            </p>
          </div>
        </div>

        {/* Configuration Button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="relative inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 bg-muted/30 hover:bg-muted px-3.5 py-2 rounded-xl cursor-pointer transition-all self-start md:self-center"
        >
          <Settings size={14} className="animate-spin-slow" />
          <span>LLM Setup</span>
          {useRealApi && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Section layout: Chat & Settings / Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left column: Quick Actions Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3.5 shadow">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Quick Operations</h3>
            
            <div className="flex flex-col gap-2.5">
              {templates.map((temp) => (
                <button
                  key={temp.id}
                  onClick={() => !isSimulating && handleQuery(temp.id)}
                  disabled={isSimulating}
                  className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    activePromptType === temp.id 
                      ? 'border-primary/50 bg-primary/5 text-foreground shadow-md' 
                      : 'border-border bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-bold flex items-center justify-between mb-1">
                    <span>{temp.label}</span>
                    <ChevronRight size={12} className="opacity-60" />
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{temp.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Agents Roster */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Cabinet Agents</h3>
            
            <div className="flex flex-col gap-2">
              {Object.entries(agents).map(([key, ag]) => {
                const AgIcon = ag.icon;
                const isTyping = typingAgent === key;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-muted/20 relative overflow-hidden transition-all ${
                      isTyping ? 'border-primary bg-primary/5 shadow-sm' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-foreground transition-all ${
                        isTyping ? 'animate-pulse scale-105' : ''
                      }`}
                      style={{ 
                        backgroundColor: isTyping ? tint(ag.accent, 0.2) : tint(ag.accent, 0.08),
                        borderColor: ag.accent + '30',
                        color: ag.accent 
                      }}
                    >
                      <AgIcon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                        {ag.name}
                        {isTyping && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block">{ag.role}</span>
                    </div>
                    {isTyping && (
                      <span className="text-[9px] font-extrabold text-primary animate-pulse mr-1">Thinking...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Interactive Console and Chat logs */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
          <div className="bg-card border border-border rounded-2xl shadow flex flex-col min-h-[460px] max-h-[550px] overflow-hidden">
            
            {/* Console Screen Header */}
            <div className="px-5 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-foreground">Multi-Agent Chat Stream</span>
              </div>
              
              {isSimulating && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[10px] font-bold text-primary border border-primary/20 bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-lg cursor-pointer transition-all"
                >
                  Skip Chat & See Report
                </button>
              )}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 min-h-0">
              {messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-muted border border-border/60 flex items-center justify-center text-muted-foreground mb-4">
                    <MessageSquare size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">Cabinet Room Empty</h4>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Select a quick operation from the sidebar or write a custom question in the input console below to kick off agent discussion.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    const agent = agents[msg.sender];
                    const AgIcon = agent ? agent.icon : null;
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        {!isUser && agent && (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-foreground"
                            style={{ 
                              backgroundColor: tint(agent.accent, 0.08), 
                              borderColor: agent.accent + '25',
                              color: agent.accent 
                            }}
                          >
                            <AgIcon size={14} />
                          </div>
                        )}
                        
                        {/* Bubble */}
                        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[10px] font-bold text-foreground">
                              {isUser ? `You (${user?.full_name || 'Founder'})` : agent.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">{msg.timestamp}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed border shadow-sm ${
                              isUser 
                                ? 'bg-primary border-primary/20 text-primary-foreground rounded-tr-none' 
                                : `rounded-tl-none border-border bg-muted/60 text-foreground`
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Live Typing Placeholder */}
                  {typingAgent && agents[typingAgent] && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3 max-w-[85%]"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                        style={{ 
                          backgroundColor: tint(agents[typingAgent].accent, 0.08), 
                          borderColor: agents[typingAgent].accent + '25',
                          color: agents[typingAgent].accent 
                        }}
                      >
                        {React.createElement(agents[typingAgent].icon, { size: 14 })}
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="text-[10px] font-bold text-foreground mb-1 px-1">
                          {agents[typingAgent].name} is typing...
                        </div>
                        <div className="p-3 bg-muted/40 border border-border/60 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input Console Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (prompt.trim() && !isSimulating) handleQuery('custom');
              }}
              className="p-3 border-t border-border/60 bg-muted/20 flex gap-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isSimulating}
                placeholder={isSimulating ? "AI Cabinet Agents are discussing..." : "Write a custom status query... (e.g. Onboarding updates, check approvals)"}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              
              <button
                type="submit"
                disabled={!prompt.trim() || isSimulating}
                className="bg-primary text-primary-foreground border border-primary/20 hover:bg-primary/95 p-2.5 rounded-xl cursor-pointer flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Send query to Cabinet Agents"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Consolidated AI Status Report ("Chitta") Panel */}
      <AnimatePresence>
        {showReport && reportData && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="w-full flex flex-col gap-4 mt-2"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              
              {/* Report Header */}
              <div className="p-5 border-b border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Executive AI Status Audit</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Generated dynamically: {reportData.timestamp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Overall Health</span>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                    reportData.summary.healthIndex === 'Healthy' 
                      ? 'text-primary border-primary/20 bg-primary/10' 
                      : 'text-[#360C13] border-[#360C13]/25 bg-[#360C13]/10'
                  }`}>
                    {reportData.summary.healthIndex.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Report Tab Headers */}
              <div className="flex border-b border-border px-5 overflow-x-auto gap-4 bg-muted/10">
                {[
                  { id: 'summary', label: 'Executive Summary' },
                  { id: 'hr', label: 'HR Operations' },
                  { id: 'it', label: 'IT Support' },
                  { id: 'projects', label: 'Project Boards' },
                  { id: 'actions', label: `Action Plan (${reportData.actionPlan.length})` }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setReportTab(t.id)}
                    className={`py-3 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap px-1 ${
                      reportTab === t.id 
                        ? 'border-primary text-foreground' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Report Content Panels */}
              <div className="p-6">
                
                {/* 1. Summary Tab */}
                {reportTab === 'summary' && (
                  <div className="flex flex-col gap-6">
                    {/* KPI Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {reportData.summary.keyMetrics.map((met, idx) => (
                        <div key={idx} className="bg-muted/40 border border-border/80 rounded-xl p-4 flex flex-col justify-between hover:border-muted-foreground/30 transition-all">
                          <div className="text-xs font-semibold text-muted-foreground leading-tight">{met.label}</div>
                          <div className="text-2xl font-extrabold text-foreground mt-3 flex items-baseline gap-2">
                            {met.value}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                              met.status === 'Present' || met.status === 'Low'
                                ? 'bg-primary/5 text-primary border-primary/20'
                                : met.status === 'Warning' || met.status === 'Medium'
                                  ? 'bg-[#A76C76]/10 text-[#671421] border-[#A76C76]/30'
                                  : 'bg-destructive/5 text-destructive border-destructive/20'
                            }`}>
                              {met.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Detailed AI Highlights */}
                    <div className="bg-muted/20 border border-border rounded-xl p-4 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} className="text-primary" />
                        Advisor Key Findings
                      </h4>
                      <div className="flex flex-col gap-2.5">
                        {reportData.summary.notableHighlights.map((high, idx) => (
                          <div key={idx} className="flex gap-2 text-xs leading-relaxed text-foreground">
                            <span className="text-primary font-bold mt-0.5">·</span>
                            <p>{high}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. HR Operations Tab */}
                {reportTab === 'hr' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* HR metrics list */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hiring & Staff Health</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Total Employees</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.hr.employeeCount} Members</span>
                        </div>
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Today's Attendance</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.hr.attendanceRate}% Active</span>
                        </div>
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Recruitment Pipeline</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.hr.recruitment.pipelineCount} Candidates</span>
                        </div>
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Open Positions</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.hr.recruitment.openJobsCount} Job Openings</span>
                        </div>
                      </div>

                      {reportData.hr.recruitment.latestCandidate && (
                        <div className="bg-muted/20 border border-border rounded-xl p-4 flex flex-col gap-2">
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Latest Candidate Activity</span>
                          <div className="text-xs font-bold text-foreground">{reportData.hr.recruitment.latestCandidate.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Role: {reportData.hr.recruitment.latestCandidate.appliedFor} · Stage: <span className="text-foreground font-semibold">{reportData.hr.recruitment.latestCandidate.stage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pending leaves queue */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leave Requests Pending Approval</h4>
                      {reportData.hr.activeLeaves.length === 0 ? (
                        <div className="bg-muted/10 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground">
                          No leave requests are waiting on you.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {reportData.hr.activeLeaves.map(l => (
                            <div key={l.id} className="bg-muted/30 border border-border/80 rounded-xl p-3.5 flex justify-between items-center gap-3">
                              <div>
                                <div className="text-xs font-bold text-foreground">{l.employee}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{l.type} · {l.days} days ({l.from} to {l.to})</div>
                                <p className="text-[11px] text-foreground/80 mt-1.5 italic">"{l.reason}"</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onNavigate && onNavigate('approvals')}
                                className="text-[10px] font-bold text-primary hover:underline border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all"
                              >
                                Decision Center
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. IT Support Tab */}
                {reportTab === 'it' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* IT metrics & approvals */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">IT Operations & Procurement</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Open Support Tickets</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.it.openTicketsCount} Tickets</span>
                        </div>
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase block leading-none">Hardware Approvals</span>
                          <span className="text-xl font-extrabold text-foreground mt-2 block">{reportData.it.pendingApprovals.length} Awaiting</span>
                        </div>
                      </div>

                      {/* IT Pending Sign-offs */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">IT Approvals Queue</span>
                        {reportData.it.pendingApprovals.length === 0 ? (
                          <div className="bg-muted/10 border border-border/60 rounded-xl p-4 text-center text-xs text-muted-foreground">
                            No IT procurement approvals are waiting.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {reportData.it.pendingApprovals.map(app => (
                              <div key={app.id} className="bg-muted/30 border border-border/80 rounded-xl p-3 flex justify-between items-center gap-3">
                                <div>
                                  <div className="text-xs font-bold text-foreground">{app.title}</div>
                                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Requested by: {app.requestedBy} · Priority: <span className="text-foreground font-semibold">{app.priority}</span></span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onNavigate && onNavigate('approvals')}
                                  className="text-[10px] font-bold text-primary hover:underline border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer"
                                >
                                  Authorize
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* IT Support ticket list */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">IT Tickets queue</h4>
                      {reportData.it.ticketsList.length === 0 ? (
                        <div className="bg-muted/10 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground">
                          All IT tickets have been resolved.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                          {reportData.it.ticketsList.map(t => (
                            <div key={t.id} className="bg-muted/30 border border-border/80 rounded-xl p-3 flex justify-between items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold text-primary font-mono shrink-0">{t.token}</span>
                                  <div className="text-xs font-bold text-foreground truncate">{t.title}</div>
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">User: {t.user} · Dept: {t.dept}</span>
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20 shrink-0">
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Project Boards Tab */}
                {reportTab === 'projects' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Projects progress list */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Projects Progress</h4>
                      <div className="flex flex-col gap-3 bg-muted/10 border border-border rounded-xl p-4">
                        {reportData.projects.projectsList.map(p => (
                          <div key={p.id} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground truncate">{p.name}</span>
                              <span className="font-bold text-primary">{p.progress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Client: {p.client}</span>
                              <span>Due: {p.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delayed / Pending tasks */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active/Pending Task Queue</h4>
                      {reportData.projects.delayedTasks.length === 0 ? (
                        <div className="bg-muted/10 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground">
                          All project tasks are complete.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {reportData.projects.delayedTasks.map(t => (
                            <div key={t.id} className="bg-muted/30 border border-border/80 rounded-xl p-3 flex justify-between items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-foreground truncate">{t.title}</div>
                                <span className="text-[10px] text-muted-foreground mt-0.5 block">Assignee: {t.assignee} · Due: {t.dueDate}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                t.status === 'In Progress'
                                  ? 'bg-[#A76C76]/10 text-[#671421] border-[#A76C76]/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate('projects')}
                            className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors text-center py-2 border border-dashed border-border hover:border-primary/40 rounded-xl cursor-pointer mt-1"
                          >
                            Open Coordinator Board
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Action Plan Tab */}
                {reportTab === 'actions' && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recommended Executive Decisions</h4>
                    
                    {reportData.actionPlan.length === 0 ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center text-xs text-primary font-medium">
                        All operations are fully optimized and resolved. Good job, Founder!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {reportData.actionPlan.map((act) => (
                          <div key={act.id} className="bg-muted/30 border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                                act.urgency === 'High' 
                                  ? 'bg-destructive' 
                                  : act.urgency === 'Medium' 
                                    ? 'bg-[#A76C76]'
                                    : 'bg-primary'
                              }`} />
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{act.category} · {act.urgency} Urgency</span>
                                <p className="text-xs text-foreground font-semibold mt-1 leading-relaxed">{act.title}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate && onNavigate(act.targetTab)}
                              className="text-xs font-bold text-primary hover:text-white border border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 self-end sm:self-center shrink-0"
                            >
                              <span>{act.actionLabel}</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel Drawer */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black cursor-pointer"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full sm:max-w-md bg-card border-l border-border h-full p-6 shadow-2xl flex flex-col gap-6 overflow-y-auto"
            >
              <div>
                <h3 className="text-base font-bold text-foreground">AI Advisor Settings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configure API integration and model properties.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="flex flex-col gap-5 flex-1">
                {/* Agent Execution Mode */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Agent Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUseRealApi(false)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !useRealApi 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Local Simulation
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseRealApi(true)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        useRealApi 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Cloud Gemini API
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Local Simulation operates fully offline, parsing dashboard states and compiling report lists instantly.
                  </span>
                </div>

                {/* Gemini Setup (conditional) */}
                {useRealApi && (
                  <div className="flex flex-col gap-4 bg-muted/30 border border-border p-4 rounded-xl">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>Gemini API Key</span>
                        <span className="text-[9px] text-destructive">*</span>
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        required={useRealApi}
                        className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground">Model Variant</label>
                      <select
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Fast)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (In-depth)</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Info block */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 text-xs text-primary leading-relaxed mt-auto">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle size={13} />
                    <span>How it works:</span>
                  </div>
                  In both modes, the agents dynamically scan current React Context states for leave requests, support tickets, and coordinator tasks to format discussions.
                </div>

                {/* Submit buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground border border-primary/20 hover:bg-primary/95 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Save Config
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
