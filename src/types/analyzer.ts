// Core Project Structure Types
export interface ProjectStructure {
  projectInfo: ProjectInfo;
  files: FileInfo[];
  dependencies: DependencyInfo[];
  complexity: ComplexityMetrics;
  codeSmells: CodeSmell[];
  technicalDebt: TechnicalDebtInfo;
  migrationReadiness: MigrationReadinessInfo;
}

export interface ProjectInfo {
  name: string;
  type: ProjectType;
  framework: string;
  path: string;
  createdDate?: Date;
  lastModified?: Date;
  version?: string;
}

export type ProjectType = 'WinForms' | 'Console' | 'Library' | 'WebForms' | 'Service' | 'Unknown' | 'Modern .NET Application';

// File Analysis Types
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  lastModified: Date;
  type: string;
  language: string;
  dependencies: string[];
  complexity: ComplexityMetrics;
  codeSmells: CodeSmell[];
  migrationComplexity: 'Low' | 'Medium' | 'High';
  conversionNotes: string[];
  encoding?: string;
  hasBackup?: boolean;
}

// Complexity Metrics
export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
  numberOfFunctions: number;
  numberOfClasses: number;
  depthOfInheritance?: number;
  couplingBetweenObjects?: number;
  linesOfComments?: number;
  duplicatedLines?: number;
}

// Code Quality Types
export interface CodeSmell {
  type: CodeSmellType;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  suggestion: string;
  autoFixable?: boolean;
  category?: CodeSmellCategory;
}

export type CodeSmellType = 
  | 'Long Method'
  | 'Large Class'
  | 'Long Parameter List'
  | 'Duplicate Code'
  | 'Dead Code'
  | 'Magic Number'
  | 'Deep Nesting'
  | 'Complex Conditional'
  | 'God Class'
  | 'Feature Envy'
  | 'Data Clumps'
  | 'Primitive Obsession'
  | 'Switch Statement'
  | 'Lazy Class'
  | 'Speculative Generality'
  | 'Temporary Field'
  | 'Message Chains'
  | 'Middle Man'
  | 'Inappropriate Intimacy'
  | 'Alternative Classes'
  | 'Incomplete Library'
  | 'Refused Bequest'
  | 'Comments Smell';

export type CodeSmellCategory = 
  | 'Bloaters'
  | 'Object-Orientation Abusers'
  | 'Change Preventers'
  | 'Dispensables'
  | 'Couplers'
  | 'Other';

// Dependency Analysis Types
export interface DependencyInfo {
  name: string;
  version: string;
  type: DependencyType;
  isObsolete: boolean;
  modernAlternative?: string;
  migrationComplexity: 'Low' | 'Medium' | 'High';
  usageCount?: number;
  lastUpdated?: Date;
  securityIssues?: SecurityIssue[];
  licenseInfo?: LicenseInfo;
}

export type DependencyType = 
  | 'assembly'
  | 'com'
  | 'nuget'
  | 'project'
  | 'framework'
  | 'native'
  | 'unknown';

export interface SecurityIssue {
  id: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  cveId?: string;
  fixVersion?: string;
}

export interface LicenseInfo {
  type: string;
  compatible: boolean;
  restrictions: string[];
}

// Migration and Modernization Types
export interface ModernizationProposal {
  suggestedStructure: ProjectStructure;
  recommendations: Recommendation[];
  risks: Risk[];
  migrationStrategy: MigrationStrategy;
  estimate: MigrationEstimate;
  timeline: Timeline;
  prerequisites: Prerequisite[];
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: Priority;
  effort: Effort;
  impact: Impact;
  rationale: string;
  implementation: string[];
  dependencies?: string[];
  estimatedHours?: number;
  roi?: number;
}

export type RecommendationType = 
  | 'Architecture'
  | 'Code Quality'
  | 'Performance'
  | 'Security'
  | 'Maintainability'
  | 'Testing'
  | 'Dependencies'
  | 'Documentation'
  | 'Deployment'
  | 'Monitoring'
  | 'Other';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Effort = 'minimal' | 'low' | 'medium' | 'high' | 'very-high';
export type Impact = 'minimal' | 'low' | 'medium' | 'high' | 'very-high';

// Risk Assessment Types
export interface Risk {
  id: string;
  category: RiskCategory;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string[];
  owner?: string;
  dueDate?: Date;
  status?: RiskStatus;
}

export type RiskCategory = 
  | 'Technical'
  | 'Business'
  | 'Operational'
  | 'Security'
  | 'Compliance'
  | 'Resource'
  | 'Timeline'
  | 'Quality'
  | 'User Experience'
  | 'Integration'
  | 'Data'
  | 'Infrastructure';

export type RiskStatus = 'identified' | 'analyzing' | 'mitigating' | 'monitoring' | 'closed';

// Migration Strategy Types
export interface MigrationStrategy {
  approach: MigrationApproach;
  phases: MigrationPhase[];
  criticalPath: string[];
  riskMitigation: string[];
  rollbackPlan?: RollbackPlan;
  testingStrategy?: TestingStrategy;
  deploymentStrategy?: DeploymentStrategy;
}

export type MigrationApproach = 
  | 'Big Bang'
  | 'Incremental'
  | 'Strangler Fig'
  | 'Database First'
  | 'Parallel Run'
  | 'Phased'
  | 'Hybrid';

export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  duration: string;
  deliverables: string[];
  dependencies: string[];
  resources: ResourceRequirement[];
  successCriteria: string[];
  risks: string[];
}

export interface ResourceRequirement {
  type: 'developer' | 'architect' | 'tester' | 'business-analyst' | 'devops' | 'other';
  count: number;
  skillLevel: 'junior' | 'mid' | 'senior' | 'expert';
  duration: string;
  partTime?: boolean;
}

// Estimation Types
export interface MigrationEstimate {
  developmentHours: number;
  totalHours: number;
  breakdown: EstimateBreakdown;
  confidence: 'Low' | 'Medium' | 'High';
  assumptions: string[];
  contingency?: number;
  costEstimate?: CostEstimate;
}

export interface EstimateBreakdown {
  forms: number;
  modules: number;
  classes: number;
  dependencies: number;
  overhead: OverheadBreakdown;
  testing?: number;
  documentation?: number;
  training?: number;
}

export interface OverheadBreakdown {
  planning: number;
  testing: number;
  integration: number;
  documentation: number;
  deployment: number;
  management?: number;
  riskBuffer?: number;
}

export interface CostEstimate {
  currency: string;
  totalCost: number;
  breakdown: {
    development: number;
    testing: number;
    projectManagement: number;
    infrastructure: number;
    licenses: number;
    training: number;
    other: number;
  };
  hourlyRates: {
    developer: number;
    architect: number;
    tester: number;
    projectManager: number;
  };
}

// Timeline Types
export interface Timeline {
  totalWeeks: number;
  phases: number;
  milestones: Milestone[];
  criticalDates: CriticalDate[];
  dependencies?: TimelineDependency[];
  bufferTime?: number;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  week: number;
  deliverables: string[];
  criteria: string[];
  dependencies?: string[];
}

export interface CriticalDate {
  id: string;
  event: string;
  week: number;
  description?: string;
  stakeholders?: string[];
  mandatory: boolean;
}

export interface TimelineDependency {
  id: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  predecessor: string;
  successor: string;
  lag?: number;
}

// Prerequisites and Requirements
export interface Prerequisite {
  id: string;
  name: string;
  description: string;
  category: PrerequisiteCategory;
  mandatory: boolean;
  estimatedTime: string;
  owner?: string;
  status?: PrerequisiteStatus;
  validationCriteria?: string[];
}

export type PrerequisiteCategory = 
  | 'Human Resources'
  | 'Infrastructure'
  | 'Documentation'
  | 'Technical Analysis'
  | 'Business Analysis'
  | 'Legal/Compliance'
  | 'Security'
  | 'Testing'
  | 'Training'
  | 'Other';

export type PrerequisiteStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';

// Technical Debt Types
export interface TechnicalDebtInfo {
  totalDebtHours: number;
  debtFactors: { [key: string]: number };
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendations: string[];
  categories: DebtCategory[];
  principal: number;
  interest: number;
  breakingPoint?: Date;
}

export interface DebtCategory {
  name: string;
  hours: number;
  priority: Priority;
  items: DebtItem[];
}

export interface DebtItem {
  description: string;
  hours: number;
  file?: string;
  lineNumber?: number;
  type: DebtType;
}

export type DebtType = 
  | 'Code Smell'
  | 'Design Debt'
  | 'Architecture Debt'
  | 'Test Debt'
  | 'Documentation Debt'
  | 'Infrastructure Debt'
  | 'Security Debt'
  | 'Performance Debt'
  | 'Dependency Debt';

// Migration Readiness Types
export interface MigrationReadinessInfo {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  blockers: string[];
  warnings: string[];
  recommendations: string[];
  readinessFactors: ReadinessFactor[];
  lastAssessment: Date;
}

export interface ReadinessFactor {
  category: string;
  score: number;
  weight: number;
  description: string;
  status: 'green' | 'yellow' | 'red';
}

// Verification and Quality Assurance Types
export interface VerificationReport {
  overallScore: number;
  structuralIntegrity: number;
  functionalEquivalence: number;
  codeQuality: number;
  performanceComparison?: PerformanceComparison;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  testResults?: TestResults;
  signOffRequired: boolean;
}

export interface PerformanceComparison {
  originalMetrics: PerformanceMetrics;
  migratedMetrics: PerformanceMetrics;
  improvement: number;
  degradation: number;
  criticalIssues: string[];
}

export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  throughput: number;
  diskIO: number;
  networkIO: number;
}

export interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage: number;
  categories: TestCategoryResults[];
}

export interface TestCategoryResults {
  category: string;
  total: number;
  passed: number;
  failed: number;
  coverage: number;
}

// Planning and Execution Types
export interface RollbackPlan {
  triggers: string[];
  steps: RollbackStep[];
  timeToRollback: string;
  dataRecovery: string[];
  communicationPlan: string[];
}

export interface RollbackStep {
  order: number;
  description: string;
  responsibility: string;
  estimatedTime: string;
  verificationCriteria: string[];
}

export interface TestingStrategy {
  levels: TestLevel[];
  types: TestType[];
  automation: AutomationStrategy;
  environments: TestEnvironment[];
  schedule: TestSchedule;
}

export interface TestLevel {
  level: 'unit' | 'integration' | 'system' | 'acceptance';
  coverage: number;
  tools: string[];
  responsibility: string;
}

export interface TestType {
  type: 'functional' | 'performance' | 'security' | 'usability' | 'compatibility';
  priority: Priority;
  tools: string[];
  schedule: string;
}

export interface AutomationStrategy {
  percentage: number;
  tools: string[];
  pipeline: string[];
  maintenance: string;
}

export interface TestEnvironment {
  name: string;
  purpose: string;
  configuration: string;
  dataRequirements: string[];
  availability: string;
}

export interface TestSchedule {
  phases: TestPhase[];
  milestones: TestMilestone[];
  dependencies: string[];
}

export interface TestPhase {
  name: string;
  duration: string;
  activities: string[];
  entry: string[];
  exit: string[];
}

export interface TestMilestone {
  name: string;
  date: Date;
  deliverables: string[];
  criteria: string[];
}

export interface DeploymentStrategy {
  approach: DeploymentApproach;
  environments: DeploymentEnvironment[];
  rolloutPlan: RolloutPlan;
  monitoring: MonitoringPlan;
  communications: CommunicationPlan;
}

export type DeploymentApproach = 
  | 'Blue-Green'
  | 'Canary'
  | 'Rolling'
  | 'Recreate'
  | 'A/B Testing'
  | 'Shadow'
  | 'Feature Toggle';

export interface DeploymentEnvironment {
  name: string;
  type: 'development' | 'testing' | 'staging' | 'production';
  configuration: string;
  requirements: string[];
  validationSteps: string[];
}

export interface RolloutPlan {
  phases: RolloutPhase[];
  criteria: string[];
  fallback: string[];
}

export interface RolloutPhase {
  name: string;
  percentage: number;
  duration: string;
  criteria: string[];
  monitoring: string[];
}

export interface MonitoringPlan {
  metrics: MonitoringMetric[];
  alerts: Alert[];
  dashboards: string[];
  responsePlan: string[];
}

export interface MonitoringMetric {
  name: string;
  type: 'performance' | 'error' | 'business' | 'security';
  threshold: number;
  frequency: string;
  action: string;
}

export interface Alert {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recipients: string[];
  escalation: string[];
}

export interface CommunicationPlan {
  stakeholders: Stakeholder[];
  channels: CommunicationChannel[];
  schedule: CommunicationSchedule[];
  templates: CommunicationTemplate[];
}

export interface Stakeholder {
  name: string;
  role: string;
  interest: 'high' | 'medium' | 'low';
  influence: 'high' | 'medium' | 'low';
  communicationPreference: string;
}

export interface CommunicationChannel {
  type: 'email' | 'meeting' | 'chat' | 'dashboard' | 'report';
  frequency: string;
  audience: string[];
  content: string;
}

export interface CommunicationSchedule {
  milestone: string;
  audience: string[];
  message: string;
  channel: string;
  timing: string;
}

export interface CommunicationTemplate {
  name: string;
  type: string;
  template: string;
  variables: string[];
}
