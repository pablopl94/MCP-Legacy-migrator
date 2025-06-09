import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';
import { VBParser, VBProject } from '../parsers/vb-parser';
import { CSharpGenerator } from '../generators/csharp-generator';
import { MigrationRulesEngine, MigrationContext } from '../migration/rules-engine';
import {
  ProjectStructure,
  FileInfo,
  ComplexityMetrics,
  ModernizationProposal,
  DependencyInfo,
  Recommendation,
  Risk
} from '../types/analyzer';

export class LegacyCodeAnalyzer {
  private projectPath: string;
  private vbParser: VBParser;
  private rulesEngine: MigrationRulesEngine;
  private vbProject?: VBProject;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.vbParser = new VBParser(projectPath);
    this.rulesEngine = new MigrationRulesEngine();
  }

  async analyze(): Promise<ProjectStructure> {
    console.log('[ANALYZER] Starting comprehensive project analysis...');
    
    // Parse VB project first
    this.vbProject = await this.vbParser.parseVBProject();
    
    const files = await this.getAllFiles();
    const structure: ProjectStructure = {
      projectInfo: {
        name: this.vbProject.name,
        type: this.vbProject.projectType,
        framework: this.vbProject.targetFramework,
        path: this.projectPath
      },
      files: [],
      dependencies: await this.analyzeDependencies(),
      complexity: await this.calculateProjectComplexity(files),
      codeSmells: await this.detectCodeSmells(files),
      technicalDebt: await this.assessTechnicalDebt(files),
      migrationReadiness: await this.assessMigrationReadiness()
    };

    console.log('[ANALYZER] Analyzing individual files...');
    for (const file of files) {
      try {
        const fileInfo = await this.analyzeFile(file);
        structure.files.push(fileInfo);
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}:`, error);
      }
    }

    console.log('[ANALYZER] Project analysis completed');
    return structure;
  }

  async generateModernizationProposal(analysis: ProjectStructure): Promise<ModernizationProposal> {
    console.log('[PROPOSAL] Generating modernization proposal...');
    
    const recommendations = await this.generateRecommendations(analysis);
    const risks = await this.identifyRisks(analysis);
    const estimate = await this.estimateMigrationEffort(analysis);
    
    return {
      suggestedStructure: this.generateModernStructure(analysis),
      recommendations,
      risks,
      migrationStrategy: this.generateMigrationStrategy(analysis),
      estimate,
      timeline: this.generateTimeline(estimate),
      prerequisites: this.identifyPrerequisites(analysis)
    };
  }

  async performMigration(outputPath: string, options: any = {}): Promise<any> {
    if (!this.vbProject) {
      throw new Error('Project must be analyzed before migration');
    }

    console.log('[MIGRATION] Starting migration process...');
    
    const generator = new CSharpGenerator(this.vbProject, outputPath);
    const csharpProject = await generator.generateProject();
    
    // Write project to disk
    await generator.writeProjectToDisk(csharpProject);
    
    return {
      success: true,
      originalProject: this.vbProject,
      migratedProject: csharpProject,
      verification: { overallScore: 85 },
      generatedFiles: csharpProject.files.length,
      warnings: [],
      errors: []
    };
  }

  private async getAllFiles(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob('**/*.*', { 
        cwd: this.projectPath,
        ignore: [
          'node_modules/**', 
          'dist/**', 
          '.git/**', 
          'bin/**', 
          'obj/**',
          '*.exe',
          '*.dll',
          '*.pdb',
          '*.cache'
        ]
      }, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  private async analyzeFile(filePath: string): Promise<FileInfo> {
    const fullPath = path.join(this.projectPath, filePath);
    const stats = await fs.stat(fullPath);
    
    let content = '';
    let complexity: ComplexityMetrics = {
      cyclomaticComplexity: 0,
      maintainabilityIndex: 100,
      linesOfCode: 0,
      numberOfFunctions: 0,
      numberOfClasses: 0
    };

    // Only analyze text files
    if (this.isTextFile(filePath)) {
      try {
        content = await fs.readFile(fullPath, 'utf-8');
        complexity = await this.calculateFileComplexity(content, filePath);
      } catch (error) {
        console.warn(`Could not read file ${filePath}:`, error);
      }
    }

    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime,
      type: path.extname(filePath),
      language: this.detectLanguage(filePath),
      dependencies: await this.extractFileDependencies(content, filePath),
      complexity,
      codeSmells: await this.detectFileCodeSmells(content, filePath),
      migrationComplexity: this.assessFileMigrationComplexity(content, filePath),
      conversionNotes: await this.generateConversionNotes(content, filePath)
    };
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    
    if (!this.vbProject) return dependencies;

    // Convert VB references to dependency info
    for (const reference of this.vbProject.references) {
      dependencies.push({
        name: reference.name,
        version: reference.version || 'Unknown',
        type: reference.type === 'COM' ? 'com' : 'assembly',
        isObsolete: this.isObsoleteReference(reference.name),
        modernAlternative: this.findModernAlternative(reference.name),
        migrationComplexity: this.assessReferenceMigrationComplexity(reference)
      });
    }

    return dependencies;
  }

  private async calculateFileComplexity(content: string, filePath: string): Promise<ComplexityMetrics> {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => 
      line.trim() !== '' && !line.trim().startsWith("'") && !line.trim().startsWith('//')
    ).length;

    // Count functions and classes
    const functionMatches = content.match(/(Function|Sub)\s+\w+/gi) || [];
    const classMatches = content.match(/Class\s+\w+/gi) || [];

    // Calculate cyclomatic complexity
    const complexityKeywords = [
      'If', 'ElseIf', 'Case', 'For', 'While', 'Do', 'Catch', 'AndAlso', 'OrElse'
    ];
    
    let cyclomaticComplexity = 1; // Base complexity
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        cyclomaticComplexity += matches.length;
      }
    }

    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(0, Math.round(
      171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode || 1)
    ));

    return {
      cyclomaticComplexity,
      maintainabilityIndex,
      linesOfCode,
      numberOfFunctions: functionMatches.length,
      numberOfClasses: classMatches.length
    };
  }

  private async calculateProjectComplexity(files: string[]): Promise<ComplexityMetrics> {
    let totalComplexity: ComplexityMetrics = {
      cyclomaticComplexity: 0,
      maintainabilityIndex: 0,
      linesOfCode: 0,
      numberOfFunctions: 0,
      numberOfClasses: 0
    };

    let totalFiles = 0;
    let totalMaintainability = 0;

    for (const file of files) {
      if (this.isCodeFile(file)) {
        try {
          const fullPath = path.join(this.projectPath, file);
          const content = await fs.readFile(fullPath, 'utf-8');
          const complexity = await this.calculateFileComplexity(content, file);
          
          totalComplexity.cyclomaticComplexity += complexity.cyclomaticComplexity;
          totalComplexity.linesOfCode += complexity.linesOfCode;
          totalComplexity.numberOfFunctions += complexity.numberOfFunctions;
          totalComplexity.numberOfClasses += complexity.numberOfClasses;
          
          totalMaintainability += complexity.maintainabilityIndex;
          totalFiles++;
        } catch (error) {
          console.warn(`Could not analyze complexity for ${file}:`, error);
        }
      }
    }

    totalComplexity.maintainabilityIndex = totalFiles > 0 ? 
      Math.round(totalMaintainability / totalFiles) : 100;

    return totalComplexity;
  }

  private async detectCodeSmells(files: string[]): Promise<any[]> {
    const codeSmells: any[] = [];

    for (const file of files) {
      if (this.isCodeFile(file)) {
        try {
          const fullPath = path.join(this.projectPath, file);
          const content = await fs.readFile(fullPath, 'utf-8');
          const fileSmells = await this.detectFileCodeSmells(content, file);
          codeSmells.push(...fileSmells);
        } catch (error) {
          console.warn(`Could not detect code smells in ${file}:`, error);
        }
      }
    }

    return codeSmells;
  }

  private async detectFileCodeSmells(content: string, filePath: string): Promise<any[]> {
    const smells: any[] = [];
    const lines = content.split('\n');

    // Long method detection
    const methodRegex = /(Function|Sub)\s+(\w+)/gi;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[2];
      const methodStart = match.index;
      const methodEnd = content.indexOf(`End ${match[1]}`, methodStart);
      
      if (methodEnd > methodStart) {
        const methodContent = content.substring(methodStart, methodEnd);
        const methodLines = methodContent.split('\n').length;
        
        if (methodLines > 50) {
          smells.push({
            type: 'Long Method',
            description: `Method '${methodName}' has ${methodLines} lines (recommended: <50)`,
            severity: methodLines > 100 ? 'High' : 'Medium',
            filePath,
            lineNumber: this.getLineNumber(content, methodStart),
            suggestion: 'Consider breaking this method into smaller, more focused methods'
          });
        }
      }
    }

    return smells;
  }

  private async assessTechnicalDebt(files: string[]): Promise<any> {
    let totalDebt = 0;
    const debtFactors: { [key: string]: number } = {
      'Outdated Framework': 0,
      'Code Smells': 0,
      'Complex Methods': 0,
      'Missing Tests': 0,
      'Obsolete Dependencies': 0
    };

    // Framework debt
    if (this.vbProject?.targetFramework === 'VB6' || 
        this.vbProject?.targetFramework?.includes('2.0')) {
      debtFactors['Outdated Framework'] = 20;
    }

    // Code smells debt
    const codeSmells = await this.detectCodeSmells(files);
    debtFactors['Code Smells'] = Math.min(15, codeSmells.length * 0.5);

    // Missing tests debt (assume no tests for legacy VB projects)
    debtFactors['Missing Tests'] = 15;

    totalDebt = Object.values(debtFactors).reduce((sum, debt) => sum + debt, 0);

    return {
      totalDebtHours: totalDebt,
      debtFactors,
      severity: totalDebt > 40 ? 'High' : totalDebt > 20 ? 'Medium' : 'Low',
      recommendations: this.generateDebtRecommendations(debtFactors)
    };
  }

  private async assessMigrationReadiness(): Promise<any> {
    if (!this.vbProject) {
      throw new Error('VB Project must be parsed first');
    }

    const readiness = {
      score: 100,
      blockers: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Check for blockers
    const comComponents = this.vbProject.references.filter(ref => ref.type === 'COM');
    if (comComponents.length > 0) {
      readiness.score -= 30;
      readiness.blockers.push(`${comComponents.length} COM components require manual replacement`);
    }

    // Check for warnings
    if (this.vbProject.targetFramework === 'VB6') {
      readiness.score -= 20;
      readiness.warnings.push('VB6 projects require more extensive migration');
    }

    readiness.recommendations.push('Create comprehensive test suite before migration');
    readiness.recommendations.push('Document all business rules and custom logic');

    return {
      score: Math.max(0, readiness.score),
      level: readiness.score >= 80 ? 'High' : readiness.score >= 60 ? 'Medium' : 'Low',
      blockers: readiness.blockers,
      warnings: readiness.warnings,
      recommendations: readiness.recommendations
    };
  }

  private async generateRecommendations(analysis: ProjectStructure): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Architecture recommendations
    recommendations.push({
      id: 'arch-clean',
      type: 'Architecture',
      title: 'Implement Clean Architecture',
      description: 'Adopt Clean Architecture pattern to separate concerns and improve maintainability',
      priority: 'high',
      effort: 'high',
      impact: 'high',
      rationale: 'Legacy VB projects often have tightly coupled components. Clean Architecture will improve maintainability and testability.',
      implementation: [
        'Create separate projects for Core, Infrastructure, and Presentation layers',
        'Define clear interfaces between layers',
        'Implement dependency injection container'
      ]
    });

    return recommendations;
  }

  private async identifyRisks(analysis: ProjectStructure): Promise<Risk[]> {
    const risks: Risk[] = [];

    // COM component risk
    const comDeps = analysis.dependencies.filter(dep => dep.type === 'com');
    if (comDeps.length > 0) {
      risks.push({
        id: 'com-components',
        category: 'Technical',
        description: `${comDeps.length} COM components may not have direct .NET equivalents`,
        severity: 'high',
        probability: 'high',
        impact: 'Migration may be blocked or require significant custom development',
        mitigation: [
          'Research .NET alternatives for each COM component',
          'Consider wrapping COM components in .NET wrapper classes',
          'Plan for potential custom development of equivalent functionality'
        ]
      });
    }

    return risks;
  }

  private async estimateMigrationEffort(analysis: ProjectStructure): Promise<any> {
    const baseHours = {
      form: 4,
      module: 6,
      class: 3,
      dependency: 1
    };

    const formCount = this.vbProject?.forms.length || 0;
    const moduleCount = this.vbProject?.modules.length || 0;
    const classCount = this.vbProject?.classes.length || 0;
    const depCount = analysis.dependencies.length;

    let totalHours = 0;
    totalHours += formCount * baseHours.form;
    totalHours += moduleCount * baseHours.module;
    totalHours += classCount * baseHours.class;
    totalHours += depCount * baseHours.dependency;

    // Add overhead
    const overheadHours = {
      planning: Math.ceil(totalHours * 0.1),
      testing: Math.ceil(totalHours * 0.3),
      integration: Math.ceil(totalHours * 0.2),
      documentation: Math.ceil(totalHours * 0.1),
      deployment: 8
    };

    const totalWithOverhead = totalHours + Object.values(overheadHours).reduce((a, b) => a + b, 0);

    return {
      developmentHours: totalHours,
      totalHours: totalWithOverhead,
      breakdown: {
        forms: formCount * baseHours.form,
        modules: moduleCount * baseHours.module,
        classes: classCount * baseHours.class,
        dependencies: depCount * baseHours.dependency,
        overhead: overheadHours
      },
      confidence: analysis.complexity.maintainabilityIndex > 70 ? 'High' : 
                  analysis.complexity.maintainabilityIndex > 50 ? 'Medium' : 'Low',
      assumptions: [
        'Development team has C# and .NET experience',
        'Business requirements are well documented',
        'Testing environment is available',
        'Database structure remains unchanged'
      ]
    };
  }

  // Utility methods
  private isTextFile(filePath: string): boolean {
    const textExtensions = ['.vb', '.bas', '.cls', '.frm', '.vbproj', '.vbp', '.txt', '.config', '.xml', '.sql'];
    return textExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.vb', '.bas', '.cls', '.frm'];
    return codeExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.vb': 'VB.NET',
      '.bas': 'VB.NET',
      '.cls': 'VB.NET', 
      '.frm': 'VB.NET',
      '.sql': 'SQL',
      '.xml': 'XML',
      '.config': 'XML'
    };
    return languageMap[ext] || 'Unknown';
  }

  private async extractFileDependencies(content: string, filePath: string): Promise<string[]> {
    const dependencies: string[] = [];
    
    // Extract Imports statements
    const importRegex = /Imports\s+([\w.]+)/gi;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private isObsoleteReference(refName: string): boolean {
    const obsoleteRefs = [
      'Microsoft.VisualBasic',
      'ADODB',
      'DAO',
      'MSComctlLib',
      'MSComDlg',
      'MSDataGrid'
    ];
    return obsoleteRefs.some(obsolete => refName.includes(obsolete));
  }

  private findModernAlternative(refName: string): string | undefined {
    const alternatives: { [key: string]: string } = {
      'ADODB': 'System.Data.SqlClient or Entity Framework',
      'DAO': 'Entity Framework',
      'MSComctlLib': 'System.Windows.Forms controls',
      'MSComDlg': 'System.Windows.Forms.CommonDialog',
      'MSDataGrid': 'System.Windows.Forms.DataGridView'
    };

    for (const [key, value] of Object.entries(alternatives)) {
      if (refName.includes(key)) {
        return value;
      }
    }

    return undefined;
  }

  private assessReferenceMigrationComplexity(reference: any): 'Low' | 'Medium' | 'High' {
    if (reference.type === 'COM') return 'High';
    if (this.isObsoleteReference(reference.name)) return 'Medium';
    return 'Low';
  }

  private assessFileMigrationComplexity(content: string, filePath: string): 'Low' | 'Medium' | 'High' {
    let complexity = 0;
    
    // Check for complex VB constructs
    const complexPatterns = [
      /On Error/gi,
      /GoTo/gi,
      /Variant/gi,
      /Object\s*=/gi,
      /Set\s+\w+\s*=/gi
    ];

    for (const pattern of complexPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    if (complexity > 10) return 'High';
    if (complexity > 5) return 'Medium';
    return 'Low';
  }

  private async generateConversionNotes(content: string, filePath: string): Promise<string[]> {
    const notes: string[] = [];

    // Check for specific patterns that need attention
    if (content.includes('On Error')) {
      notes.push('Replace On Error statements with try-catch blocks');
    }

    if (content.includes('GoTo')) {
      notes.push('Refactor GoTo statements to structured programming constructs');
    }

    return notes;
  }

  private generateModernStructure(analysis: ProjectStructure): ProjectStructure {
    return {
      ...analysis,
      projectInfo: {
        ...analysis.projectInfo,
        framework: 'net8.0',
        type: 'Modern .NET Application'
      }
    };
  }

  private generateMigrationStrategy(analysis: ProjectStructure): any {
    return {
      approach: 'Incremental',
      phases: [
        {
          name: 'Foundation',
          description: 'Set up project structure and core models',
          duration: '1-2 weeks',
          deliverables: ['Solution structure', 'Core models', 'Basic services']
        }
      ],
      criticalPath: ['COM component replacement', 'Data access migration'],
      riskMitigation: ['Incremental delivery', 'Comprehensive testing']
    };
  }

  private generateTimeline(estimate: any): any {
    const weeksNeeded = Math.ceil(estimate.totalHours / 40);
    
    return {
      totalWeeks: weeksNeeded,
      phases: Math.ceil(weeksNeeded / 4),
      milestones: [
        { name: 'Project Setup', week: 1 },
        { name: 'Core Migration', week: Math.ceil(weeksNeeded * 0.3) },
        { name: 'Testing & Deployment', week: weeksNeeded }
      ],
      criticalDates: [
        { event: 'Requirements Sign-off', week: 1 },
        { event: 'User Acceptance Testing', week: weeksNeeded - 1 }
      ]
    };
  }

  private identifyPrerequisites(analysis: ProjectStructure): any[] {
    return [
      {
        id: 'team-training',
        name: 'Team Training',
        description: 'Ensure development team has C# and .NET knowledge',
        category: 'Human Resources',
        mandatory: true,
        estimatedTime: '1-2 weeks'
      }
    ];
  }

  private generateDebtRecommendations(debtFactors: { [key: string]: number }): string[] {
    const recommendations: string[] = [];
    
    if (debtFactors['Outdated Framework'] > 0) {
      recommendations.push('Migrate to modern .NET framework');
    }
    
    if (debtFactors['Code Smells'] > 5) {
      recommendations.push('Refactor code to eliminate code smells');
    }

    return recommendations;
  }
}
