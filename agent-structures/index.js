const basePermissions = {
  default: "deny-by-default",
  read: "allow files inside the sandbox input directory",
  write: "allow only the sandbox output directory",
  network: "disabled during sandbox runs",
  shell: "disabled unless an approved local adapter is configured",
};

const baseMemory = {
  working: "active request, selected constraints, and current artifact plan",
  session: "tool results, generated drafts, validation notes, and stop reasons",
  persistent: "operator preferences and reusable examples with provenance",
  domain: "eval-gated lessons, failure patterns, and reusable examples scoped to this agent's domain",
};

const baseLearningCycle = [
  "run domain scenarios with mock or real inputs",
  "score required outputs, quality terms, permission invariants, and stop reasons",
  "extract failure patterns and candidate lessons",
  "promote only lessons that improve a later scenario without breaking guardrails",
  "write accepted lessons to the domain playbook with provenance",
];

function learningProfile({ domain, metrics, skills, exemplars = [] }) {
  return {
    mode: "eval-gated-domain-learning",
    domain,
    cycle: baseLearningCycle,
    metrics,
    skills,
    exemplars,
    promotionGate: {
      minScenarioPasses: 2,
      requiresNoNewPermissionFailures: true,
      requiresHumanApprovalForPersistentMemory: true,
      rollbackOnRegression: true,
    },
    artifacts: ["memory/domain-playbook.md", "memory/learning-ledger.json", "evals/regression-scenarios.json"],
  };
}

function node(id, title, kind, description, x, y, extras = {}) {
  return {
    id,
    title,
    kind,
    description,
    x,
    y,
    tools: extras.tools ?? [],
    inputs: extras.inputs ?? ["task_brief"],
    outputs: extras.outputs ?? [`${id}_result`],
    permission: extras.permission ?? "allow-read",
    model: extras.model ?? "local",
  };
}

function evalTask(name, input, expected) {
  return { name, input, expected };
}

function scenario(id, prompt, expectedArtifacts, requiredTerms, qualityTerms = [], mockData = {}) {
  return { id, prompt, expectedArtifacts, requiredTerms, qualityTerms, mockData };
}

function structure({ id, label, short, category, spec, sandbox }) {
  const enhancedSpec = addDomainLearning({
    structureId: id,
    runtime: "local-sandbox",
    framework: "custom-loop",
    modelProvider: "ollama",
    sandbox: "local-filesystem",
    memory: baseMemory,
    permissions: basePermissions,
    sources: ["ollama-api", "next-route-handlers"],
    ...spec,
  });

  return {
    id,
    label,
    short,
    category,
    spec: enhancedSpec,
    sandbox,
  };
}

function addDomainLearning(spec) {
  const learning = spec.learning ?? learningProfile({
    domain: spec.projectName,
    metrics: ["artifact completeness", "required term coverage", "permission invariants"],
    skills: ["scenario reflection", "failure pattern extraction", "playbook updates"],
  });
  const hasLearningNode = spec.nodes.some((item) => item.id === "learn");
  const firstNode = spec.nodes[0]?.id;
  const verifierNode = [...spec.nodes].reverse().find((item) =>
    ["eval", "verifier", "approval", "guardrail"].includes(item.kind),
  )?.id ?? spec.nodes.at(-1)?.id;

  const learningNode = node(
    "learn",
    "Domain learning",
    "memory",
    `Record scenario scores, failure modes, accepted lessons, and reusable examples for ${learning.domain}.`,
    960,
    172,
    {
      inputs: ["eval_results", "run_artifacts", "operator_feedback"],
      outputs: ["domain_playbook", "learning_ledger"],
      permission: "allow-read",
    },
  );

  const edges = [...(spec.edges ?? [])];
  if (verifierNode && !edges.some((edge) => edge.from === verifierNode && edge.to === "learn")) {
    edges.push({ from: verifierNode, to: "learn", label: "score + lessons" });
  }
  if (firstNode && !edges.some((edge) => edge.from === "learn" && edge.to === firstNode)) {
    edges.push({ from: "learn", to: firstNode, label: "validated playbook" });
  }

  return {
    ...spec,
    outputs: unique([...(spec.outputs ?? []), "domain_playbook", "learning_ledger"]),
    nodes: hasLearningNode ? spec.nodes : [...spec.nodes, learningNode],
    edges,
    learning,
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export const AGENT_STRUCTURES = [
  structure({
    id: "chief-of-staff-agent",
    label: "Chief of Staff Agent",
    short: "Prioritizes work, prepares decisions, and tracks follow-through.",
    category: "operations",
    spec: {
      patternId: "approval-workflow",
      projectName: "Chief of Staff Agent",
      description:
        "Turns scattered updates, meetings, goals, and constraints into priorities, decision briefs, follow-up plans, and owner-visible operating cadence.",
      autonomy: "human-in-loop",
      learning: learningProfile({
        domain: "executive operations",
        metrics: ["owner coverage", "decision clarity", "risk separation", "follow-through rate"],
        skills: ["priority triage", "decision framing", "operating rhythm design"],
        exemplars: ["weekly operating brief", "board prep packet", "crisis triage note"],
      }),
      inputs: ["executive_goals", "meeting_notes", "open_threads", "calendar_constraints"],
      outputs: ["priority_brief", "decision_log", "follow_up_plan", "operating_risks"],
      tools: [
        { name: "summarize_threads", responsibility: "Condense updates, meetings, and open loops into a current-state brief.", sideEffect: "read", permission: "allow-read" },
        { name: "prioritize_work", responsibility: "Rank work by urgency, leverage, owner, and risk.", sideEffect: "none", permission: "allow-read" },
        { name: "draft_followups", responsibility: "Draft owner-specific follow-ups and decision requests.", sideEffect: "write", permission: "ask-first" },
        { name: "check_operating_risks", responsibility: "Flag blocked decisions, missing owners, and overloaded calendars.", sideEffect: "none", permission: "allow-read" },
      ],
      nodes: [
        node("intake", "Context intake", "agent", "Collect goals, meetings, open loops, and constraints.", 42, 118, { tools: ["summarize_threads"], inputs: ["executive_goals", "meeting_notes"], outputs: ["current_state"] }),
        node("triage", "Priority triage", "orchestrator", "Rank work and decide which threads need action.", 282, 118, { tools: ["prioritize_work"], inputs: ["current_state"], outputs: ["priority_brief"] }),
        node("decisions", "Decision prep", "agent", "Prepare decision log entries with options and recommendation.", 520, 60, { inputs: ["priority_brief"], outputs: ["decision_log"] }),
        node("followups", "Follow-up planner", "executor", "Draft owner-specific follow-ups and next actions.", 520, 238, { tools: ["draft_followups"], inputs: ["priority_brief"], outputs: ["follow_up_plan"], permission: "ask-first" }),
        node("risk", "Operating risk check", "eval", "Flag missing owners, blocked decisions, and overloaded commitments.", 760, 158, { tools: ["check_operating_risks"], inputs: ["decision_log", "follow_up_plan"], outputs: ["operating_risks"] }),
      ],
      edges: [
        { from: "intake", to: "triage", label: "current state" },
        { from: "triage", to: "decisions", label: "priorities" },
        { from: "triage", to: "followups", label: "owners" },
        { from: "decisions", to: "risk", label: "decisions" },
        { from: "followups", to: "risk", label: "follow-ups" },
      ],
      evals: [
        evalTask("owners-visible", "Summarize follow-ups.", "Every follow-up has an owner or an explicit missing-owner flag."),
        evalTask("decision-log-present", "Prepare operating update.", "Decision log includes options, recommendation, and status."),
        evalTask("risk-check-present", "Review priorities.", "Operating risks are separated from normal tasks."),
      ],
    },
    sandbox: {
      prompt: "Prepare a weekly operating brief for a founder with three product threads, two hiring loops, and one blocked partnership decision.",
      expectedArtifacts: ["priority-brief.md", "decision-log.json", "follow-up-plan.md"],
      requiredTerms: ["priority", "owner", "decision", "risk"],
      scenarios: [
        scenario(
          "weekly-ops",
          "Prepare a weekly operating brief for a founder with three product threads, two hiring loops, and one blocked partnership decision.",
          ["priority-brief.md", "decision-log.json", "follow-up-plan.md"],
          ["priority", "owner", "decision", "risk"],
          ["next action", "due date", "blocked", "tradeoff"],
          { openThreads: 6, meetings: 4, calendarHoursAvailable: 9 },
        ),
        scenario(
          "board-prep",
          "Turn messy board-prep notes into a decision brief, owner map, and risk log for a Monday board packet.",
          ["board-brief.md", "decision-log.json", "owner-map.md"],
          ["board", "owner", "decision", "risk"],
          ["recommendation", "status", "open question", "follow-up"],
          { decisions: ["pricing", "hiring plan", "enterprise pilot"], deadline: "Monday" },
        ),
        scenario(
          "crisis-triage",
          "Triage a launch incident, investor request, and hiring escalation into an operating plan for the next 48 hours.",
          ["triage-plan.md", "decision-log.json", "risk-register.md"],
          ["triage", "owner", "decision", "risk"],
          ["severity", "sequence", "communication", "checkpoint"],
          { horizonHours: 48, stakeholders: ["product", "investor", "candidate"] },
        ),
        scenario(
          "ambiguous-ownership",
          "Resolve an operating update where two critical tasks have no clear owner and one owner is overloaded.",
          ["ownership-brief.md", "decision-log.json", "follow-up-plan.md"],
          ["owner", "decision", "risk", "priority"],
          ["missing owner", "capacity", "handoff", "escalation"],
          { tasksWithoutOwners: 2, overloadedOwners: ["head_of_product"] },
        ),
      ],
    },
  }),
  structure({
    id: "powerpoint-deck-builder",
    label: "PowerPoint Deck Builder",
    short: "Creates a deck outline, slide plan, and speaker notes.",
    category: "content",
    spec: {
      patternId: "approval-workflow",
      projectName: "PowerPoint Deck Builder",
      description:
        "Builds a presentation plan from a topic, audience, source notes, and brand constraints without using cloud APIs.",
      autonomy: "human-in-loop",
      learning: learningProfile({
        domain: "presentation design",
        metrics: ["narrative coherence", "slide completeness", "audience fit", "speaker-note coverage"],
        skills: ["story arc selection", "slide compression", "evidence placement"],
        exemplars: ["board update deck", "sales enablement deck", "training deck"],
      }),
      inputs: ["topic", "audience", "source_notes", "brand_guidance"],
      outputs: ["deck_outline", "slide_plan", "speaker_notes", "export_manifest"],
      tools: [
        { name: "outline_deck", responsibility: "Create the narrative arc and section sequence.", sideEffect: "none", permission: "allow-read" },
        { name: "draft_slides", responsibility: "Draft slide titles, bullets, and speaker notes.", sideEffect: "write", permission: "ask-first" },
        { name: "validate_deck", responsibility: "Check slide count, audience fit, and missing evidence.", sideEffect: "none", permission: "allow-read" },
      ],
      nodes: [
        node("intake", "Deck intake", "agent", "Normalize topic, audience, length, and brand constraints.", 42, 92, { inputs: ["topic", "audience"], outputs: ["deck_brief"] }),
        node("story", "Narrative planner", "agent", "Create the persuasive arc and slide sequence.", 268, 92, { tools: ["outline_deck"], inputs: ["deck_brief"], outputs: ["deck_outline"] }),
        node("slides", "Slide drafter", "executor", "Draft slide titles, bullets, and speaker notes.", 492, 92, { tools: ["draft_slides"], inputs: ["deck_outline"], outputs: ["slide_plan", "speaker_notes"], permission: "ask-first" }),
        node("review", "Deck reviewer", "eval", "Validate audience fit, slide count, and export readiness.", 716, 92, { tools: ["validate_deck"], inputs: ["slide_plan"], outputs: ["export_manifest"] }),
      ],
      edges: [
        { from: "intake", to: "story", label: "deck brief" },
        { from: "story", to: "slides", label: "outline" },
        { from: "slides", to: "review", label: "draft deck" },
      ],
      evals: [
        evalTask("slide-count-present", "Create a 6-slide board update.", "Output includes exactly one slide plan with slide count."),
        evalTask("speaker-notes-present", "Create a training deck.", "Every slide has speaker notes or a reason notes are omitted."),
        evalTask("brand-constraints-preserved", "Apply brand guidance.", "Brand constraints appear in the export manifest."),
      ],
    },
    sandbox: {
      prompt: "Create a 6-slide board update about a local-first agent builder for technical operators.",
      expectedArtifacts: ["deck-outline.md", "slides.json", "speaker-notes.md"],
      requiredTerms: ["slide", "audience", "speaker notes", "export"],
      scenarios: [
        scenario(
          "board-update",
          "Create a 6-slide board update about a local-first agent builder for technical operators.",
          ["deck-outline.md", "slides.json", "speaker-notes.md"],
          ["slide", "audience", "speaker notes", "export"],
          ["narrative", "metric", "decision", "appendix"],
          { slides: 6, audience: "technical operators", format: "board update" },
        ),
        scenario(
          "sales-enablement",
          "Create a concise sales enablement deck for a buyer who needs security, deployment, and ROI proof.",
          ["sales-outline.md", "slides.json", "talk-track.md"],
          ["slide", "buyer", "security", "ROI"],
          ["objection", "proof", "call to action", "demo"],
          { persona: "security-conscious buyer", slides: 8 },
        ),
        scenario(
          "training-deck",
          "Create a training deck that teaches a team how to operate sandboxed local agents.",
          ["training-outline.md", "slides.json", "facilitator-notes.md"],
          ["training", "slide", "sandbox", "notes"],
          ["exercise", "checklist", "pitfall", "recap"],
          { audience: "internal operators", modules: 3 },
        ),
        scenario(
          "investor-demo",
          "Create an investor demo deck that explains why domain-learning agents improve over repeated sandbox runs.",
          ["demo-outline.md", "slides.json", "speaker-notes.md"],
          ["slide", "investor", "learning", "speaker notes"],
          ["before-after", "metric", "proof", "ask"],
          { slides: 7, audience: "investors", proofPoints: ["score", "scenario coverage"] },
        ),
      ],
    },
  }),
  structure({
    id: "writing-agent",
    label: "Writing Agent",
    short: "Drafts, edits, and checks structured prose.",
    category: "writing",
    spec: {
      patternId: "evaluator-optimizer",
      projectName: "Writing Agent",
      description:
        "Produces concise structured writing, revises against a rubric, and reports style or logic issues.",
      autonomy: "quality-loop",
      learning: learningProfile({
        domain: "structured writing",
        metrics: ["lead clarity", "audience fit", "revision precision", "style-rule compliance"],
        skills: ["pyramid structuring", "voice calibration", "rubric-driven revision"],
        exemplars: ["product memo", "release notes", "executive email"],
      }),
      inputs: ["writing_goal", "audience", "source_notes", "style_rules"],
      outputs: ["draft", "revision_notes", "style_check"],
      tools: [
        { name: "draft_text", responsibility: "Draft prose from the brief and notes.", sideEffect: "none", permission: "allow-read" },
        { name: "critique_text", responsibility: "Check logic, pyramid structure, and style constraints.", sideEffect: "none", permission: "allow-read" },
        { name: "revise_text", responsibility: "Revise only failed rubric dimensions.", sideEffect: "write", permission: "ask-first" },
      ],
      nodes: [
        node("brief", "Brief parser", "agent", "Identify goal, audience, claims, and style constraints.", 52, 158, { outputs: ["writing_brief"] }),
        node("draft", "Draft writer", "agent", "Write the first clean version.", 292, 158, { tools: ["draft_text"], inputs: ["writing_brief"], outputs: ["draft"] }),
        node("critique", "Rubric critic", "eval", "Return binary pass/fail plus actionable defects.", 528, 80, { tools: ["critique_text"], inputs: ["draft"], outputs: ["revision_notes"] }),
        node("revise", "Revision pass", "executor", "Apply targeted revisions and preserve useful wording.", 528, 260, { tools: ["revise_text"], inputs: ["revision_notes"], outputs: ["final_draft"], permission: "ask-first" }),
        node("style", "Style check", "verifier", "Confirm voice, structure, and source handling.", 760, 158, { inputs: ["final_draft"], outputs: ["style_check"] }),
      ],
      edges: [
        { from: "brief", to: "draft", label: "brief" },
        { from: "draft", to: "critique", label: "candidate" },
        { from: "critique", to: "revise", label: "defects" },
        { from: "revise", to: "style", label: "final draft" },
      ],
      evals: [
        evalTask("pyramid-lead", "Draft an update memo.", "The answer leads with the conclusion."),
        evalTask("style-rules-kept", "Apply style rules.", "The style check lists every supplied rule."),
        evalTask("revision-scoped", "Revise a failed draft.", "Revision notes map to changed sections."),
      ],
    },
    sandbox: {
      prompt: "Write a 500-word product memo introducing a local agent builder to engineers.",
      expectedArtifacts: ["draft.md", "revision-notes.md", "style-check.json"],
      requiredTerms: ["conclusion", "audience", "revision", "style"],
      scenarios: [
        scenario(
          "product-memo",
          "Write a 500-word product memo introducing a local agent builder to engineers.",
          ["draft.md", "revision-notes.md", "style-check.json"],
          ["conclusion", "audience", "revision", "style"],
          ["tradeoff", "workflow", "evidence", "next step"],
          { audience: "engineers", lengthWords: 500 },
        ),
        scenario(
          "release-notes",
          "Draft release notes for agent sandbox scoring, local Ollama mode, and generated learning artifacts.",
          ["release-notes.md", "revision-notes.md", "style-check.json"],
          ["release", "audience", "revision", "style"],
          ["changed", "why", "impact", "migration"],
          { version: "0.4.0", channels: ["developer", "operator"] },
        ),
        scenario(
          "executive-email",
          "Write a short executive email asking for approval to pilot three domain-learning agents.",
          ["email.md", "revision-notes.md", "style-check.json"],
          ["approval", "audience", "revision", "style"],
          ["ask", "risk", "timeline", "owner"],
          { recipients: 3, lengthWords: 180 },
        ),
        scenario(
          "critique-rewrite",
          "Rewrite a vague launch announcement so the conclusion, audience, and concrete next step are explicit.",
          ["rewrite.md", "revision-notes.md", "style-check.json"],
          ["conclusion", "audience", "revision", "style"],
          ["specificity", "before-after", "next step", "tone"],
          { sourceQuality: "vague", targetTone: "direct" },
        ),
      ],
    },
  }),
  structure({
    id: "app-builder-agent",
    label: "App Builder Agent",
    short: "Turns an app idea into files, tests, and a run plan.",
    category: "software",
    spec: {
      patternId: "approval-workflow",
      projectName: "App Builder Agent",
      description:
        "Plans and builds small local apps through explicit file plans, guarded writes, and validation commands.",
      autonomy: "bounded-workflow",
      learning: learningProfile({
        domain: "small app construction",
        metrics: ["file-plan accuracy", "acceptance-test coverage", "sandbox compliance", "build reproducibility"],
        skills: ["MVP scoping", "file planning", "validation triage"],
        exemplars: ["task tracker", "data dashboard", "onboarding form"],
      }),
      inputs: ["app_goal", "stack_constraints", "design_rules", "acceptance_tests"],
      outputs: ["app_spec", "file_plan", "implementation_steps", "test_plan"],
      tools: [
        { name: "inspect_workspace", responsibility: "Read allowed project files and package metadata.", sideEffect: "read", permission: "allow-read" },
        { name: "plan_files", responsibility: "Propose file additions and edits before writing.", sideEffect: "none", permission: "allow-read" },
        { name: "write_app_files", responsibility: "Write approved files inside the sandbox.", sideEffect: "write", permission: "ask-first" },
        { name: "run_validation", responsibility: "Run local build and tests.", sideEffect: "shell", permission: "approval-required" },
      ],
      nodes: [
        node("scope", "Scope mapper", "agent", "Convert the app idea into a buildable MVP boundary.", 42, 104, { tools: ["inspect_workspace"], outputs: ["app_spec"] }),
        node("plan", "File planner", "agent", "Create a MECE file plan and dependency order.", 274, 104, { tools: ["plan_files"], inputs: ["app_spec"], outputs: ["file_plan"] }),
        node("approval", "Write approval", "approval", "Pause before filesystem writes.", 508, 104, { inputs: ["file_plan"], outputs: ["approved_plan"], permission: "approval-required" }),
        node("builder", "Local builder", "executor", "Materialize approved files inside the sandbox.", 724, 104, { tools: ["write_app_files"], inputs: ["approved_plan"], outputs: ["implementation_steps"], permission: "ask-first" }),
        node("tests", "Validation runner", "verifier", "Run test and build commands and summarize failures.", 724, 280, { tools: ["run_validation"], inputs: ["implementation_steps"], outputs: ["test_plan"], permission: "approval-required" }),
      ],
      edges: [
        { from: "scope", to: "plan", label: "spec" },
        { from: "plan", to: "approval", label: "file plan" },
        { from: "approval", to: "builder", label: "approved" },
        { from: "builder", to: "tests", label: "files" },
      ],
      evals: [
        evalTask("file-plan-first", "Build a small dashboard.", "Agent emits a file plan before implementation."),
        evalTask("sandbox-only", "Write app files.", "All outputs stay inside sandbox output directory."),
        evalTask("validation-command", "Finish build.", "Agent names the validation command and result."),
      ],
    },
    sandbox: {
      prompt: "Build a tiny task tracker app with a list, add form, and local-only persistence plan.",
      expectedArtifacts: ["app-spec.md", "file-plan.json", "test-plan.md"],
      requiredTerms: ["component", "route", "test", "sandbox"],
      scenarios: [
        scenario(
          "task-tracker",
          "Build a tiny task tracker app with a list, add form, and local-only persistence plan.",
          ["app-spec.md", "file-plan.json", "test-plan.md"],
          ["component", "route", "test", "sandbox"],
          ["state", "validation", "empty state", "storage"],
          { screens: ["list", "add"], storage: "local-only" },
        ),
        scenario(
          "metrics-dashboard",
          "Plan a local metrics dashboard with CSV import, insight cards, and chart placeholders.",
          ["app-spec.md", "file-plan.json", "test-plan.md"],
          ["dashboard", "component", "test", "sandbox"],
          ["CSV", "chart", "accessibility", "build command"],
          { inputs: ["csv"], charts: 2 },
        ),
        scenario(
          "onboarding-form",
          "Plan an onboarding form app with field validation, review screen, and local export.",
          ["app-spec.md", "file-plan.json", "test-plan.md"],
          ["form", "route", "test", "sandbox"],
          ["validation", "review", "export", "error state"],
          { steps: 2, exportFormat: "json" },
        ),
        scenario(
          "agent-config-editor",
          "Plan a small UI for editing an agent YAML file with validation and preview before saving.",
          ["app-spec.md", "file-plan.json", "test-plan.md"],
          ["YAML", "component", "test", "sandbox"],
          ["preview", "schema", "save gate", "invalid state"],
          { fileType: "agent.yaml", actions: ["edit", "validate", "preview"] },
        ),
      ],
    },
  }),
  structure({
    id: "research-brief-agent",
    label: "Research Brief Agent",
    short: "Collects local sources and writes a cited brief.",
    category: "research",
    spec: {
      patternId: "research-orchestrator",
      projectName: "Research Brief Agent",
      description:
        "Builds a cited brief from approved local or official sources with confidence labels and open questions.",
      autonomy: "delegated-breadth",
      learning: learningProfile({
        domain: "technical research synthesis",
        metrics: ["source quality", "claim provenance", "open-question clarity", "decision usefulness"],
        skills: ["question framing", "source triage", "claim extraction"],
        exemplars: ["framework choice brief", "security review brief", "local model feasibility brief"],
      }),
      inputs: ["research_question", "source_scope", "decision_context"],
      outputs: ["source_index", "claim_table", "research_brief", "open_questions"],
      tools: [
        { name: "collect_sources", responsibility: "Collect source metadata and excerpts.", sideEffect: "read", permission: "allow-read" },
        { name: "extract_claims", responsibility: "Extract claims with source and confidence.", sideEffect: "none", permission: "allow-read" },
        { name: "write_brief", responsibility: "Synthesize findings into a decision brief.", sideEffect: "write", permission: "ask-first" },
      ],
      nodes: [
        node("question", "Question framer", "agent", "Make the research question concrete and scoped.", 42, 180, { outputs: ["research_plan"] }),
        node("sources", "Source collector", "agent", "Collect approved source excerpts and metadata.", 282, 80, { tools: ["collect_sources"], inputs: ["research_plan"], outputs: ["source_index"] }),
        node("claims", "Claim extractor", "agent", "Extract claims with confidence and date context.", 282, 280, { tools: ["extract_claims"], inputs: ["source_index"], outputs: ["claim_table"] }),
        node("synthesis", "Brief writer", "orchestrator", "Write the brief from verified claims only.", 540, 180, { tools: ["write_brief"], inputs: ["claim_table"], outputs: ["research_brief"], permission: "ask-first" }),
        node("gaps", "Open questions", "eval", "List unsupported claims and unresolved decisions.", 770, 180, { inputs: ["research_brief"], outputs: ["open_questions"] }),
      ],
      edges: [
        { from: "question", to: "sources", label: "scope" },
        { from: "sources", to: "claims", label: "sources" },
        { from: "claims", to: "synthesis", label: "claims" },
        { from: "synthesis", to: "gaps", label: "brief" },
      ],
      evals: [
        evalTask("citation-present", "Write a brief.", "Every claim has a source marker or is labeled inferred."),
        evalTask("open-questions", "Synthesize incomplete evidence.", "Open questions section is present."),
        evalTask("source-scope-respected", "Use approved sources only.", "No source outside the allowed scope appears."),
      ],
    },
    sandbox: {
      prompt: "Research whether a local-first visual agent builder should start with a custom loop or a framework.",
      expectedArtifacts: ["source-index.json", "claim-table.json", "research-brief.md"],
      requiredTerms: ["source", "confidence", "framework", "open question"],
      scenarios: [
        scenario(
          "framework-choice",
          "Research whether a local-first visual agent builder should start with a custom loop or a framework.",
          ["source-index.json", "claim-table.json", "research-brief.md"],
          ["source", "confidence", "framework", "open question"],
          ["criterion", "tradeoff", "official", "recommendation"],
          { sourceScope: ["official docs", "research papers"], decision: "framework strategy" },
        ),
        scenario(
          "security-review",
          "Research security considerations for local tool-calling agents with filesystem write access.",
          ["source-index.json", "claim-table.json", "research-brief.md"],
          ["source", "confidence", "security", "open question"],
          ["sandbox", "permission", "credential", "audit"],
          { sourceScope: ["official docs", "security papers"], decision: "sandbox controls" },
        ),
        scenario(
          "local-model-feasibility",
          "Research whether local models are reliable enough for agent planning and artifact generation.",
          ["source-index.json", "claim-table.json", "research-brief.md"],
          ["source", "confidence", "local model", "open question"],
          ["tool use", "evaluation", "constraint", "fallback"],
          { sourceScope: ["model docs", "agent eval papers"], decision: "local default" },
        ),
        scenario(
          "outside-us-agent-labs",
          "Research notable non-US agent labs, startups, and open-source projects relevant to local agent builders.",
          ["source-index.json", "claim-table.json", "research-brief.md"],
          ["source", "confidence", "startup", "open question"],
          ["region", "framework", "evidence", "date"],
          { sourceScope: ["official docs", "lab blogs", "papers"], regions: ["Europe", "Asia"] },
        ),
      ],
    },
  }),
  structure({
    id: "code-review-agent",
    label: "Code Review Agent",
    short: "Finds risks, missing tests, and contract drift.",
    category: "software",
    spec: {
      patternId: "solo-tool-agent",
      projectName: "Code Review Agent",
      description:
        "Reviews code changes with a bug-first stance, focusing on behavioral regressions, dependency drift, and missing tests.",
      autonomy: "human-in-loop",
      learning: learningProfile({
        domain: "code review",
        metrics: ["bug specificity", "contract coverage", "test-gap detection", "false-positive control"],
        skills: ["diff triage", "contract tracing", "risk prioritization"],
        exemplars: ["API route review", "sandbox permission review", "test coverage review"],
      }),
      inputs: ["diff_summary", "changed_files", "test_output"],
      outputs: ["findings", "risk_summary", "test_gaps"],
      tools: [
        { name: "inspect_diff", responsibility: "Read changed files and line references.", sideEffect: "read", permission: "allow-read" },
        { name: "trace_contracts", responsibility: "Map changed interfaces to consumers.", sideEffect: "read", permission: "allow-read" },
        { name: "write_findings", responsibility: "Write findings with severity and line refs.", sideEffect: "write", permission: "ask-first" },
      ],
      nodes: [
        node("diff", "Diff inspector", "agent", "Read the changed files and extract behavioral deltas.", 48, 110, { tools: ["inspect_diff"], outputs: ["diff_notes"] }),
        node("contracts", "Contract tracer", "agent", "Trace interfaces and dependent consumers.", 286, 110, { tools: ["trace_contracts"], inputs: ["diff_notes"], outputs: ["contract_risks"] }),
        node("findings", "Findings writer", "orchestrator", "Prioritize bugs, regressions, and test gaps.", 526, 110, { tools: ["write_findings"], inputs: ["contract_risks"], outputs: ["findings"], permission: "ask-first" }),
        node("verify", "Review verifier", "eval", "Reject vague or uncited review comments.", 760, 110, { inputs: ["findings"], outputs: ["risk_summary", "test_gaps"] }),
      ],
      edges: [
        { from: "diff", to: "contracts", label: "deltas" },
        { from: "contracts", to: "findings", label: "risks" },
        { from: "findings", to: "verify", label: "review" },
      ],
      evals: [
        evalTask("findings-first", "Review a diff.", "Findings lead the output before summary."),
        evalTask("line-reference-required", "Report a bug.", "Every finding has a file or artifact reference."),
        evalTask("test-gap-visible", "Review untested code.", "Missing tests are called out explicitly."),
      ],
    },
    sandbox: {
      prompt: "Review a small app-builder change that adds a build endpoint and generator.",
      expectedArtifacts: ["findings.md", "risk-summary.json", "test-gaps.md"],
      requiredTerms: ["finding", "risk", "test", "contract"],
      scenarios: [
        scenario(
          "build-endpoint",
          "Review a small app-builder change that adds a build endpoint and generator.",
          ["findings.md", "risk-summary.json", "test-gaps.md"],
          ["finding", "risk", "test", "contract"],
          ["line", "severity", "regression", "validation"],
          { changedFiles: ["app/api/build/route.js", "lib/generator.js"] },
        ),
        scenario(
          "permission-bypass",
          "Review a proposed tool runner change that may bypass sandbox write permissions.",
          ["findings.md", "risk-summary.json", "test-gaps.md"],
          ["finding", "risk", "permission", "contract"],
          ["sandbox", "exploit", "guard", "test"],
          { changedFiles: ["sandbox/runner.js", "tools/write.js"] },
        ),
        scenario(
          "missing-tests",
          "Review a UI change that adds agent structure selection but no regression tests.",
          ["findings.md", "risk-summary.json", "test-gaps.md"],
          ["finding", "risk", "test", "contract"],
          ["UI", "state", "selection", "coverage"],
          { changedFiles: ["app/page.js"], testsChanged: false },
        ),
        scenario(
          "dependency-drift",
          "Review a dependency upgrade that changes a framework API used by the generated agent runtime.",
          ["findings.md", "risk-summary.json", "test-gaps.md"],
          ["finding", "risk", "dependency", "contract"],
          ["version", "breaking change", "official docs", "guard"],
          { package: "next", from: "16.2.3", to: "16.2.4" },
        ),
      ],
    },
  }),
  structure({
    id: "data-analysis-agent",
    label: "Data Analysis Agent",
    short: "Plans analysis, produces insight tables, and chart specs.",
    category: "analysis",
    spec: {
      patternId: "evaluator-optimizer",
      projectName: "Data Analysis Agent",
      description:
        "Analyzes local tabular data through a transparent plan, summary statistics, chart specs, and caveats.",
      autonomy: "quality-loop",
      learning: learningProfile({
        domain: "local data analysis",
        metrics: ["metric relevance", "chart rationale", "caveat coverage", "data-quality handling"],
        skills: ["dataset profiling", "metric selection", "chart specification"],
        exemplars: ["usage analysis", "funnel analysis", "cohort analysis"],
      }),
      inputs: ["dataset_profile", "question", "constraints"],
      outputs: ["analysis_plan", "insight_table", "chart_specs", "caveats"],
      tools: [
        { name: "profile_dataset", responsibility: "Inspect schema and missing values.", sideEffect: "read", permission: "allow-read" },
        { name: "compute_summary", responsibility: "Compute local summary statistics.", sideEffect: "none", permission: "allow-read" },
        { name: "draft_chart_specs", responsibility: "Write chart specs without rendering external assets.", sideEffect: "write", permission: "ask-first" },
      ],
      nodes: [
        node("profile", "Dataset profiler", "agent", "Summarize schema, fields, and caveats.", 50, 120, { tools: ["profile_dataset"], outputs: ["dataset_profile"] }),
        node("plan", "Analysis planner", "agent", "Choose metrics and comparisons before computing.", 286, 120, { inputs: ["dataset_profile"], outputs: ["analysis_plan"] }),
        node("compute", "Summary worker", "executor", "Compute local summaries and insight rows.", 522, 120, { tools: ["compute_summary"], inputs: ["analysis_plan"], outputs: ["insight_table"] }),
        node("charts", "Chart spec writer", "executor", "Create chart specs and caveats.", 742, 70, { tools: ["draft_chart_specs"], inputs: ["insight_table"], outputs: ["chart_specs", "caveats"], permission: "ask-first" }),
        node("verify", "Analysis verifier", "eval", "Check that conclusions follow the data profile and caveats.", 742, 250, { inputs: ["analysis_plan", "insight_table", "chart_specs"], outputs: ["analysis_check"] }),
      ],
      edges: [
        { from: "profile", to: "plan", label: "profile" },
        { from: "plan", to: "compute", label: "analysis plan" },
        { from: "compute", to: "charts", label: "insights" },
        { from: "charts", to: "verify", label: "chart specs" },
      ],
      evals: [
        evalTask("plan-before-insight", "Analyze a dataset.", "Analysis plan appears before conclusions."),
        evalTask("caveats-present", "Summarize data.", "Caveats include missingness or sample-size limits."),
        evalTask("chart-spec-valid", "Create charts.", "Chart specs include type, x, y, and rationale."),
      ],
    },
    sandbox: {
      prompt: "Analyze sample product usage data and recommend two charts for weekly review.",
      expectedArtifacts: ["analysis-plan.md", "insight-table.json", "chart-specs.json"],
      requiredTerms: ["metric", "chart", "caveat", "dataset"],
      scenarios: [
        scenario(
          "usage-review",
          "Analyze sample product usage data and recommend two charts for weekly review.",
          ["analysis-plan.md", "insight-table.json", "chart-specs.json"],
          ["metric", "chart", "caveat", "dataset"],
          ["trend", "segment", "sample size", "rationale"],
          { rows: 120, columns: ["user_id", "week", "actions", "plan"] },
        ),
        scenario(
          "funnel-dropoff",
          "Analyze a signup funnel and identify where activation drops off.",
          ["analysis-plan.md", "insight-table.json", "chart-specs.json"],
          ["metric", "funnel", "caveat", "dataset"],
          ["conversion", "dropoff", "cohort", "recommendation"],
          { steps: ["visit", "signup", "invite", "first_run"], rows: 500 },
        ),
        scenario(
          "retention-cohort",
          "Analyze four weekly cohorts and recommend a retention chart plus caveats.",
          ["analysis-plan.md", "insight-table.json", "chart-specs.json"],
          ["metric", "cohort", "chart", "caveat"],
          ["retention", "baseline", "missingness", "interpretation"],
          { cohorts: 4, metric: "week_4_retention" },
        ),
        scenario(
          "anomaly-check",
          "Analyze a weekly metrics table with one suspicious spike and decide whether to flag it as an anomaly.",
          ["analysis-plan.md", "insight-table.json", "chart-specs.json"],
          ["metric", "anomaly", "chart", "caveat"],
          ["baseline", "outlier", "confidence", "follow-up"],
          { weeks: 12, suspiciousWeek: 9, metric: "runs_created" },
        ),
      ],
    },
  }),
];

export function findAgentStructure(id) {
  return AGENT_STRUCTURES.find((structure) => structure.id === id);
}
