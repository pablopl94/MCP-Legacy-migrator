import * as fs from 'fs-extra';
import * as path from 'path';

export interface VBMethod {
  name: string;
  returnType: string;
  parameters: VBParameter[];
  visibility: 'Public' | 'Private' | 'Friend';
  isFunction: boolean;
  body: string;
  lineNumber: number;
  complexity: number;
}

export interface VBParameter {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface VBVariable {
  name: string;
  type: string;
  scope: 'Module' | 'Function' | 'Form';
  visibility: 'Public' | 'Private' | 'Dim';
  value?: string;
  lineNumber: number;
}

export interface VBEvent {
  name: string;
  controlName: string;
  eventType: string;
  body: string;
  lineNumber: number;
  parameters: VBParameter[];
}

export interface VBControl {
  name: string;
  type: string;
  properties: { [key: string]: string };
  events: VBEvent[];
}

export interface VBModuleAnalysis {
  fileName: string;
  filePath: string;
  moduleType: 'Form' | 'Module' | 'Class';
  
  // Code structure
  variables: VBVariable[];
  methods: VBMethod[];
  events: VBEvent[];
  
  // Form-specific
  controls?: VBControl[];
  formProperties?: { [key: string]: string };
  
  // Dependencies
  imports: string[];
  references: string[];
  
  // Business logic analysis
  businessLogic: {
    databaseOperations: DatabaseOperation[];
    fileOperations: FileOperation[];
    calculations: Calculation[];
    validations: Validation[];
  };
  
  // Code quality metrics
  metrics: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    codeSmells: string[];
    technicalDebt: string[];
  };
  
  // Migration recommendations
  migrationNotes: string[];
  complexity: 'Low' | 'Medium' | 'High';
  estimatedHours: number;
}

export interface DatabaseOperation {
  type: 'Select' | 'Insert' | 'Update' | 'Delete' | 'Connection';
  table?: string;
  query: string;
  method: string;
  lineNumber: number;
  usesADO: boolean;
  usesDAO: boolean;
}

export interface FileOperation {
  type: 'Read' | 'Write' | 'Delete' | 'Create';
  path: string;
  method: string;
  lineNumber: number;
}

export interface Calculation {
  description: string;
  variables: string[];
  formula: string;
  lineNumber: number;
}

export interface Validation {
  type: 'Required' | 'Range' | 'Format' | 'Custom';
  field: string;
  condition: string;
  errorMessage?: string;
  lineNumber: number;
}

export class VBModuleAnalyzer {
  constructor() {}

  async analyzeModule(filePath: string): Promise<VBModuleAnalysis> {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    let moduleType: 'Form' | 'Module' | 'Class';
    if (extension === '.frm') {
      moduleType = 'Form';
    } else if (extension === '.bas') {
      moduleType = 'Module';
    } else if (extension === '.cls') {
      moduleType = 'Class';
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }

    const analysis: VBModuleAnalysis = {
      fileName,
      filePath,
      moduleType,
      variables: this.extractVariables(content),
      methods: this.extractMethods(content),
      events: this.extractEvents(content),
      imports: this.extractImports(content),
      references: this.extractReferences(content),
      businessLogic: this.analyzeBusinessLogic(content),
      metrics: this.calculateMetrics(content),
      migrationNotes: [],
      complexity: 'Medium',
      estimatedHours: 0
    };

    if (moduleType === 'Form') {
      analysis.controls = this.extractControls(content);
      analysis.formProperties = this.extractFormProperties(content);
    }

    // Calculate complexity and estimation
    analysis.complexity = this.assessComplexity(analysis);
    analysis.estimatedHours = this.estimateEffort(analysis);
    analysis.migrationNotes = this.generateMigrationNotes(analysis);

    return analysis;
  }

  private extractVariables(content: string): VBVariable[] {
    const variables: VBVariable[] = [];
    const lines = content.split('\n');
    
    const variablePatterns = [
      /^(Public|Private|Dim)\s+(\w+)\s+As\s+(\w+)(?:\s*=\s*(.+?))?$/i,
      /^(Public|Private|Dim)\s+(\w+)\s*As\s*New\s+(\w+)$/i,
      /^(Public|Private|Dim)\s+(\w+)(?:\s*=\s*(.+?))?$/i
    ];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      for (const pattern of variablePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const [, visibility, name, type, value] = match;
          variables.push({
            name,
            type: type || 'Variant',
            scope: 'Module', // We'll refine this later
            visibility: visibility as any,
            value,
            lineNumber: index + 1
          });
          break;
        }
      }
    });

    return variables;
  }

  private extractMethods(content: string): VBMethod[] {
    const methods: VBMethod[] = [];
    const lines = content.split('\n');
    
    const methodStartPattern = /^(Public|Private|Friend)?\s*(Sub|Function)\s+(\w+)\s*(\([^)]*\))?(?:\s+As\s+(\w+))?/i;
    const methodEndPattern = /^End\s+(Sub|Function)/i;
    
    let currentMethod: Partial<VBMethod> | null = null;
    let methodBody: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (currentMethod) {
        if (methodEndPattern.test(trimmed)) {
          // End of method
          if (currentMethod.name) {
            methods.push({
              ...currentMethod,
              body: methodBody.join('\n'),
              complexity: this.calculateMethodComplexity(methodBody.join('\n'))
            } as VBMethod);
          }
          currentMethod = null;
          methodBody = [];
        } else {
          methodBody.push(line);
        }
      } else {
        const match = trimmed.match(methodStartPattern);
        if (match) {
          const [, visibility = 'Public', methodType, name, params = '', returnType = 'void'] = match;
          
          currentMethod = {
            name,
            returnType: returnType || (methodType.toLowerCase() === 'function' ? 'Variant' : 'void'),
            parameters: this.parseParameters(params),
            visibility: visibility as any,
            isFunction: methodType.toLowerCase() === 'function',
            lineNumber: index + 1
          };
        }
      }
    });

    return methods;
  }

  private extractEvents(content: string): VBEvent[] {
    const events: VBEvent[] = [];
    const lines = content.split('\n');
    
    const eventPattern = /^(Private\s+)?Sub\s+(\w+)_(\w+)\s*(\([^)]*\))?/i;
    const methodEndPattern = /^End\s+Sub/i;
    
    let currentEvent: Partial<VBEvent> | null = null;
    let eventBody: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (currentEvent) {
        if (methodEndPattern.test(trimmed)) {
          // End of event
          if (currentEvent.name) {
            events.push({
              ...currentEvent,
              body: eventBody.join('\n')
            } as VBEvent);
          }
          currentEvent = null;
          eventBody = [];
        } else {
          eventBody.push(line);
        }
      } else {
        const match = trimmed.match(eventPattern);
        if (match) {
          const [, , controlName, eventType, params = ''] = match;
          
          currentEvent = {
            name: `${controlName}_${eventType}`,
            controlName,
            eventType,
            lineNumber: index + 1,
            parameters: this.parseParameters(params)
          };
        }
      }
    });

    return events;
  }

  private extractControls(content: string): VBControl[] {
    const controls: VBControl[] = [];
    const lines = content.split('\n');
    
    let currentControl: Partial<VBControl> | null = null;
    let inControlDefinition = false;
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Begin VB.')) {
        const match = trimmed.match(/Begin VB\.(\w+)\s+(\w+)/);
        if (match) {
          const [, type, name] = match;
          currentControl = {
            name,
            type,
            properties: {},
            events: []
          };
          inControlDefinition = true;
        }
      } else if (trimmed === 'End' && currentControl && inControlDefinition) {
        controls.push(currentControl as VBControl);
        currentControl = null;
        inControlDefinition = false;
      } else if (inControlDefinition && currentControl && trimmed.includes('=')) {
        const [prop, value] = trimmed.split('=').map(s => s.trim());
        if (currentControl.properties) {
          currentControl.properties[prop] = value.replace(/"/g, '');
        }
      }
    });

    return controls;
  }

  private extractFormProperties(content: string): { [key: string]: string } {
    const properties: { [key: string]: string } = {};
    const lines = content.split('\n');
    
    let inFormSection = false;
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Begin VB.Form')) {
        inFormSection = true;
      } else if (trimmed === 'End' && inFormSection) {
        inFormSection = false;
      } else if (inFormSection && trimmed.includes('=')) {
        const [prop, value] = trimmed.split('=').map(s => s.trim());
        properties[prop] = value.replace(/"/g, '');
      }
    });

    return properties;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('Imports ')) {
        imports.push(trimmed.substring(8).trim());
      }
    });

    return imports;
  }

  private extractReferences(content: string): string[] {
    const references: string[] = [];
    
    // Look for common VB6/VB.NET references in code
    const referencePatterns = [
      /CreateObject\s*\(\s*"([^"]+)"/gi,
      /New\s+(\w+)/gi,
      /Set\s+\w+\s*=\s*CreateObject\s*\(\s*"([^"]+)"/gi
    ];

    referencePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        references.push(match[1]);
      }
    });

    return [...new Set(references)]; // Remove duplicates
  }

  private analyzeBusinessLogic(content: string): {
    databaseOperations: DatabaseOperation[];
    fileOperations: FileOperation[];
    calculations: Calculation[];
    validations: Validation[];
  } {
    return {
      databaseOperations: this.extractDatabaseOperations(content),
      fileOperations: this.extractFileOperations(content),
      calculations: this.extractCalculations(content),
      validations: this.extractValidations(content)
    };
  }

  private extractDatabaseOperations(content: string): DatabaseOperation[] {
    const operations: DatabaseOperation[] = [];
    const lines = content.split('\n');
    
    const patterns = [
      { pattern: /\.Execute\s*\(\s*"([^"]+)"/gi, type: 'Select' as const },
      { pattern: /\.Open\s*\(\s*"([^"]+)"/gi, type: 'Select' as const },
      { pattern: /INSERT\s+INTO/gi, type: 'Insert' as const },
      { pattern: /UPDATE\s+\w+\s+SET/gi, type: 'Update' as const },
      { pattern: /DELETE\s+FROM/gi, type: 'Delete' as const },
      { pattern: /SELECT\s+.+\s+FROM/gi, type: 'Select' as const },
      { pattern: /\.ConnectionString\s*=/gi, type: 'Connection' as const }
    ];

    lines.forEach((line, index) => {
      patterns.forEach(({ pattern, type }) => {
        const matches = line.match(pattern);
        if (matches) {
          operations.push({
            type,
            query: line.trim(),
            method: this.findMethodName(lines, index),
            lineNumber: index + 1,
            usesADO: line.includes('ADODB') || line.includes('Connection'),
            usesDAO: line.includes('DAO') || line.includes('Database')
          });
        }
      });
    });

    return operations;
  }

  private extractFileOperations(content: string): FileOperation[] {
    const operations: FileOperation[] = [];
    const lines = content.split('\n');
    
    const patterns = [
      { pattern: /Open\s+.*For\s+(Input|Output|Append)/gi, type: 'Read' as const },
      { pattern: /Print\s*#/gi, type: 'Write' as const },
      { pattern: /Write\s*#/gi, type: 'Write' as const },
      { pattern: /Kill\s+/gi, type: 'Delete' as const },
      { pattern: /MkDir\s+/gi, type: 'Create' as const }
    ];

    lines.forEach((line, index) => {
      patterns.forEach(({ pattern, type }) => {
        const matches = line.match(pattern);
        if (matches) {
          operations.push({
            type,
            path: this.extractFilePath(line),
            method: this.findMethodName(lines, index),
            lineNumber: index + 1
          });
        }
      });
    });

    return operations;
  }

  private extractCalculations(content: string): Calculation[] {
    const calculations: Calculation[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Look for mathematical operations
      if (trimmed.includes('=') && (
        trimmed.includes('+') || 
        trimmed.includes('-') || 
        trimmed.includes('*') || 
        trimmed.includes('/') ||
        trimmed.includes('Sqr(') ||
        trimmed.includes('Abs(') ||
        trimmed.includes('Int(')
      )) {
        const variables = this.extractVariablesFromLine(trimmed);
        calculations.push({
          description: `Mathematical operation: ${trimmed}`,
          variables,
          formula: trimmed,
          lineNumber: index + 1
        });
      }
    });

    return calculations;
  }

  private extractValidations(content: string): Validation[] {
    const validations: Validation[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Look for validation patterns
      if (trimmed.includes('If') && (
        trimmed.includes('IsEmpty') ||
        trimmed.includes('Len(') ||
        trimmed.includes('IsNumeric') ||
        trimmed.includes('IsDate') ||
        trimmed.includes('<>') ||
        trimmed.includes('=""')
      )) {
        validations.push({
          type: this.determineValidationType(trimmed),
          field: this.extractFieldFromValidation(trimmed),
          condition: trimmed,
          lineNumber: index + 1
        });
      }
    });

    return validations;
  }

  private calculateMetrics(content: string): {
    linesOfCode: number;
    cyclomaticComplexity: number;
    codeSmells: string[];
    technicalDebt: string[];
  } {
    const lines = content.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("'") && !trimmed.startsWith('Attribute');
    });

    const complexity = this.calculateCyclomaticComplexity(content);
    const codeSmells = this.detectCodeSmells(content);
    const technicalDebt = this.detectTechnicalDebt(content);

    return {
      linesOfCode: codeLines.length,
      cyclomaticComplexity: complexity,
      codeSmells,
      technicalDebt
    };
  }

  private calculateCyclomaticComplexity(content: string): number {
    let complexity = 1; // Base complexity
    
    const complexityPatterns = [
      /\bIf\b/gi,
      /\bElseIf\b/gi,
      /\bFor\b/gi,
      /\bWhile\b/gi,
      /\bDo\b/gi,
      /\bSelect\s+Case\b/gi,
      /\bCase\b/gi,
      /\bOn\s+Error\b/gi,
      /\bAnd\b/gi,
      /\bOr\b/gi
    ];

    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateMethodComplexity(methodBody: string): number {
    return this.calculateCyclomaticComplexity(methodBody);
  }

  private detectCodeSmells(content: string): string[] {
    const smells: string[] = [];
    
    // Long method detection
    const methods = this.extractMethods(content);
    methods.forEach(method => {
      if (method.body.split('\n').length > 50) {
        smells.push(`Long method: ${method.name} (${method.body.split('\n').length} lines)`);
      }
      if (method.complexity > 10) {
        smells.push(`Complex method: ${method.name} (complexity: ${method.complexity})`);
      }
    });

    // Magic numbers
    const magicNumberPattern = /\b\d{2,}\b/g;
    const magicNumbers = content.match(magicNumberPattern);
    if (magicNumbers && magicNumbers.length > 5) {
      smells.push(`Magic numbers detected: ${magicNumbers.length} instances`);
    }

    // Commented code
    const commentedCodePattern = /'\s*(Dim|If|For|Sub|Function)/gi;
    const commentedCode = content.match(commentedCodePattern);
    if (commentedCode && commentedCode.length > 3) {
      smells.push(`Commented code detected: ${commentedCode.length} instances`);
    }

    return smells;
  }

  private detectTechnicalDebt(content: string): string[] {
    const debt: string[] = [];
    
    // VB6 specific technical debt
    if (content.includes('On Error Resume Next')) {
      debt.push('Error handling: Uses "On Error Resume Next" (should be replaced with try-catch)');
    }
    
    if (content.includes('Variant')) {
      debt.push('Type safety: Uses Variant type (should use specific types)');
    }
    
    if (content.includes('GoTo')) {
      debt.push('Control flow: Uses GoTo statements (should use structured programming)');
    }
    
    if (content.includes('CreateObject')) {
      debt.push('COM dependencies: Uses CreateObject (may need modern alternatives)');
    }

    return debt;
  }

  private parseParameters(paramString: string): VBParameter[] {
    const parameters: VBParameter[] = [];
    
    if (!paramString || paramString === '()') {
      return parameters;
    }
    
    const cleanParams = paramString.replace(/[()]/g, '').trim();
    if (!cleanParams) return parameters;
    
    const params = cleanParams.split(',');
    
    params.forEach(param => {
      const trimmed = param.trim();
      const match = trimmed.match(/^(Optional\s+)?(\w+)\s+As\s+(\w+)(?:\s*=\s*(.+?))?$/i);
      
      if (match) {
        const [, optional, name, type, defaultValue] = match;
        parameters.push({
          name,
          type,
          isOptional: !!optional,
          defaultValue
        });
      }
    });

    return parameters;
  }

  private findMethodName(lines: string[], currentIndex: number): string {
    // Look backwards for the method declaration
    for (let i = currentIndex; i >= 0; i--) {
      const line = lines[i].trim();
      const match = line.match(/^(Public|Private|Friend)?\s*(Sub|Function)\s+(\w+)/i);
      if (match) {
        return match[3];
      }
    }
    return 'Unknown';
  }

  private extractFilePath(line: string): string {
    const match = line.match(/"([^"]+)"/);
    return match ? match[1] : 'Unknown';
  }

  private extractVariablesFromLine(line: string): string[] {
    const variables: string[] = [];
    const words = line.split(/[\s=+\-*/()]+/);
    
    words.forEach(word => {
      if (word.match(/^[a-zA-Z]\w*$/)) {
        variables.push(word);
      }
    });

    return [...new Set(variables)];
  }

  private determineValidationType(line: string): 'Required' | 'Range' | 'Format' | 'Custom' {
    if (line.includes('IsEmpty') || line.includes('=""')) return 'Required';
    if (line.includes('Len(') && (line.includes('>') || line.includes('<'))) return 'Range';
    if (line.includes('IsNumeric') || line.includes('IsDate')) return 'Format';
    return 'Custom';
  }

  private extractFieldFromValidation(line: string): string {
    const match = line.match(/(\w+)\.Text|(\w+)\.Value|(\w+)\s*[<>=]/);
    return match ? (match[1] || match[2] || match[3]) : 'Unknown';
  }

  private assessComplexity(analysis: VBModuleAnalysis): 'Low' | 'Medium' | 'High' {
    let score = 0;
    
    // Lines of code
    if (analysis.metrics.linesOfCode > 500) score += 2;
    else if (analysis.metrics.linesOfCode > 200) score += 1;
    
    // Cyclomatic complexity
    if (analysis.metrics.cyclomaticComplexity > 20) score += 2;
    else if (analysis.metrics.cyclomaticComplexity > 10) score += 1;
    
    // Number of methods
    if (analysis.methods.length > 20) score += 2;
    else if (analysis.methods.length > 10) score += 1;
    
    // Business logic complexity
    const totalBusinessOps = 
      analysis.businessLogic.databaseOperations.length +
      analysis.businessLogic.fileOperations.length +
      analysis.businessLogic.calculations.length +
      analysis.businessLogic.validations.length;
      
    if (totalBusinessOps > 20) score += 2;
    else if (totalBusinessOps > 10) score += 1;
    
    // Code smells
    if (analysis.metrics.codeSmells.length > 5) score += 1;
    
    if (score >= 6) return 'High';
    if (score >= 3) return 'Medium';
    return 'Low';
  }

  private estimateEffort(analysis: VBModuleAnalysis): number {
    let hours = 2; // Base time
    
    // Add time based on lines of code
    hours += Math.ceil(analysis.metrics.linesOfCode / 100);
    
    // Add time based on complexity
    switch (analysis.complexity) {
      case 'High': hours += 8; break;
      case 'Medium': hours += 4; break;
      case 'Low': hours += 2; break;
    }
    
    // Add time for business logic migration
    const businessLogic = analysis.businessLogic;
    hours += businessLogic.databaseOperations.length * 0.5;
    hours += businessLogic.fileOperations.length * 0.3;
    hours += businessLogic.calculations.length * 0.2;
    hours += businessLogic.validations.length * 0.2;
    
    // Add time for UI migration (forms)
    if (analysis.moduleType === 'Form' && analysis.controls) {
      hours += analysis.controls.length * 0.5;
    }
    
    // Add time for technical debt
    hours += analysis.metrics.technicalDebt.length * 0.5;
    
    return Math.ceil(hours);
  }

  private generateMigrationNotes(analysis: VBModuleAnalysis): string[] {
    const notes: string[] = [];
    
    // Module type specific notes
    if (analysis.moduleType === 'Form') {
      notes.push('Form migration: Consider modern UI framework (WPF, WinUI, or web-based)');
      if (analysis.controls && analysis.controls.length > 10) {
        notes.push('Complex UI: Consider breaking into smaller components');
      }
    }
    
    // Database operations
    if (analysis.businessLogic.databaseOperations.length > 0) {
      const hasADO = analysis.businessLogic.databaseOperations.some(op => op.usesADO);
      const hasDAO = analysis.businessLogic.databaseOperations.some(op => op.usesDAO);
      
      if (hasADO) notes.push('Database: Migrate ADO to Entity Framework or ADO.NET');
      if (hasDAO) notes.push('Database: Migrate DAO to modern data access patterns');
    }
    
    // File operations
    if (analysis.businessLogic.fileOperations.length > 0) {
      notes.push('File I/O: Replace VB6 file operations with System.IO classes');
    }
    
    // Technical debt
    analysis.metrics.technicalDebt.forEach(debt => {
      notes.push(`Technical debt: ${debt}`);
    });
    
    // Code smells
    if (analysis.metrics.codeSmells.length > 3) {
      notes.push('Code quality: Address code smells before migration');
    }
    
    return notes;
  }
}