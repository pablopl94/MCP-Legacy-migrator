import { VBParser, VBProject } from './parsers/vb-parser';
import { CSharpGenerator, CSharpProject } from './generators/csharp-generator';
import { MigrationRulesEngine, MigrationContext } from './migration/rules-engine';
import { LegacyCodeAnalyzer } from './services/analyzer';
import { VBModuleAnalyzer } from './analyzers/vb-module-analyzer';
import { ModernArchitectureGenerator } from './analyzers/architecture-generator';
import { ModuleMigrator } from './analyzers/module-migrator';
import * as path from 'path';
import * as fs from 'fs-extra';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class LegacyMCPServer {
  private rulesEngine: MigrationRulesEngine;

  constructor() {
    this.rulesEngine = new MigrationRulesEngine();
    this.setupStdioHandlers();
  }

  private setupStdioHandlers(): void {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data: string) => {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          this.handleRequest(line.trim());
        }
      }
    });

    // Keep process alive
    process.stdin.resume();
  }

  private async handleRequest(requestStr: string): Promise<void> {
    try {
      const request: MCPRequest = JSON.parse(requestStr);
      let response: MCPResponse;

      switch (request.method) {
        case 'initialize':
          response = this.handleInitialize(request);
          break;
        case 'tools/list':
          response = this.handleListTools(request);
          break;
        case 'tools/call':
          response = await this.handleToolCall(request);
          break;
        default:
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }

      this.sendResponse(response);
    } catch (error) {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error instanceof Error ? error.message : String(error)
        }
      };
      this.sendResponse(errorResponse);
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'legacy-vb-to-csharp-migrator',
          version: '2.0.0'
        }
      }
    };
  }

  private handleListTools(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: [
          {
            name: 'analyze_vb_project',
            description: 'Analyze a VB.NET or VB6 project structure and extract metadata',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the VB project directory'
                },
                includeCodeAnalysis: {
                  type: 'boolean',
                  description: 'Whether to include detailed code analysis',
                  default: true
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'generate_csharp_migration',
            description: 'Generate complete C# project from VB analysis',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the VB project to migrate'
                },
                outputPath: {
                  type: 'string',
                  description: 'Output directory for the C# project'
                },
                targetFramework: {
                  type: 'string',
                  description: 'Target .NET framework version',
                  enum: ['net8.0', 'net7.0', 'net6.0', 'net48'],
                  default: 'net8.0'
                },
                architecture: {
                  type: 'string',
                  description: 'Target architecture pattern',
                  enum: ['Clean', 'Layered', 'MVC', 'Simple'],
                  default: 'Clean'
                }
              },
              required: ['projectPath', 'outputPath']
            }
          },
          {
            name: 'apply_migration_rules',
            description: 'Apply VB to C# conversion rules to code content',
            inputSchema: {
              type: 'object',
              properties: {
                vbContent: {
                  type: 'string',
                  description: 'VB.NET code content to convert'
                },
                filePath: {
                  type: 'string',
                  description: 'Path of the file being converted (for context)'
                },
                projectType: {
                  type: 'string',
                  description: 'Type of VB project',
                  enum: ['WinForms', 'Console', 'Library', 'WebForms'],
                  default: 'WinForms'
                }
              },
              required: ['vbContent']
            }
          },
          {
            name: 'estimate_migration_effort',
            description: 'Estimate effort and complexity for VB to C# migration',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the VB project'
                },
                includeDetailedBreakdown: {
                  type: 'boolean',
                  description: 'Include detailed effort breakdown',
                  default: true
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'analyze_vb_module_details',
            description: 'Analyze specific VB module/form and extract detailed business logic',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the specific VB file (.frm, .bas, .cls)'
                },
                extractBusinessLogic: {
                  type: 'boolean',
                  description: 'Extract business logic and methods',
                  default: true
                },
                analyzeUIComponents: {
                  type: 'boolean',
                  description: 'Analyze UI components for .frm files',
                  default: true
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'generate_modern_architecture_proposal',
            description: 'Generate modern C# architecture proposal based on VB project analysis',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the VB project'
                },
                targetArchitecture: {
                  type: 'string',
                  description: 'Target architecture style',
                  enum: ['Clean', 'Layered', 'MVC', 'MVVM', 'Microservices'],
                  default: 'Clean'
                },
                includeDatabase: {
                  type: 'boolean',
                  description: 'Include database layer recommendations',
                  default: true
                },
                modernPatterns: {
                  type: 'boolean',
                  description: 'Include modern patterns (DI, Repository, etc.)',
                  default: true
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'migrate_specific_module',
            description: 'Migrate specific VB module/form to modern C# with full business logic',
            inputSchema: {
              type: 'object',
              properties: {
                vbFilePath: {
                  type: 'string',
                  description: 'Path to the VB file to migrate'
                },
                targetArchitecture: {
                  type: 'string',
                  description: 'Target C# architecture',
                  enum: ['Clean', 'Layered', 'MVC', 'MVVM'],
                  default: 'Clean'
                },
                outputDirectory: {
                  type: 'string',
                  description: 'Output directory for generated C# files'
                },
                generateTests: {
                  type: 'boolean',
                  description: 'Generate unit tests for business logic',
                  default: true
                },
                modernizePatterns: {
                  type: 'boolean',
                  description: 'Apply modern patterns (async/await, dependency injection)',
                  default: true
                }
              },
              required: ['vbFilePath', 'outputDirectory']
            }
          }
        ]
      }
    };
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    try {
      const { name, arguments: args } = request.params;

      let result: any;
      switch (name) {
        case 'analyze_vb_project':
          result = await this.handleAnalyzeVBProject(args);
          break;
        case 'generate_csharp_migration':
          result = await this.handleGenerateCSharpMigration(args);
          break;
        case 'apply_migration_rules':
          result = await this.handleApplyMigrationRules(args);
          break;
        case 'estimate_migration_effort':
          result = await this.handleEstimateMigrationEffort(args);
          break;
        case 'analyze_vb_module_details':
          result = await this.handleAnalyzeVBModuleDetails(args);
          break;
        case 'generate_modern_architecture_proposal':
          result = await this.handleGenerateModernArchitectureProposal(args);
          break;
        case 'migrate_specific_module':
          result = await this.handleMigrateSpecificModule(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async handleAnalyzeVBProject(args: any): Promise<any> {
    const { projectPath, includeCodeAnalysis = true } = args;

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const parser = new VBParser(projectPath);
    const vbProject = await parser.parseVBProject();
    
    let analysis = null;
    if (includeCodeAnalysis) {
      const analyzer = new LegacyCodeAnalyzer(projectPath);
      analysis = await analyzer.analyze();
    }

    const result = {
      project: vbProject,
      analysis: analysis,
      summary: {
        totalFiles: vbProject.forms.length + vbProject.modules.length + vbProject.classes.length,
        formsCount: vbProject.forms.length,
        modulesCount: vbProject.modules.length,
        classesCount: vbProject.classes.length,
        referencesCount: vbProject.references.length,
        projectType: vbProject.projectType,
        targetFramework: vbProject.targetFramework
      }
    };

    return result;
  }

  private async handleGenerateCSharpMigration(args: any): Promise<any> {
    const { projectPath, outputPath, targetFramework = 'net8.0', architecture = 'Clean' } = args;

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Parse VB project
    const parser = new VBParser(projectPath);
    const vbProject = await parser.parseVBProject();

    // Generate C# project
    const generator = new CSharpGenerator(vbProject, outputPath);
    const csharpProject = await generator.generateProject();

    // Write files to disk
    await generator.writeProjectToDisk(csharpProject);

    const result = {
      success: true,
      originalProject: {
        name: vbProject.name,
        type: vbProject.projectType,
        filesCount: vbProject.forms.length + vbProject.modules.length + vbProject.classes.length
      },
      migratedProject: {
        name: csharpProject.name,
        targetFramework: csharpProject.targetFramework,
        filesGenerated: csharpProject.files.length,
        outputPath: outputPath
      },
      files: csharpProject.files.map(f => ({
        path: f.path,
        type: f.type,
        size: f.content.length
      }))
    };

    return result;
  }

  private async handleApplyMigrationRules(args: any): Promise<any> {
    const { vbContent, filePath = 'unknown.vb', projectType = 'WinForms' } = args;

    const context: MigrationContext = {
      filePath,
      fileContent: vbContent,
      projectType,
      targetFramework: 'net8.0',
      usings: new Set(),
      variables: new Map(),
      functions: new Map()
    };

    const convertedContent = this.rulesEngine.applyRules(vbContent, context);

    const result = {
      original: vbContent,
      converted: convertedContent,
      appliedRulesCount: this.rulesEngine.getRules().filter(rule => 
        rule.pattern.test(vbContent)
      ).length,
      context: {
        filePath,
        projectType
      }
    };

    return result;
  }

  private async handleEstimateMigrationEffort(args: any): Promise<any> {
    const { projectPath, includeDetailedBreakdown = true } = args;

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const parser = new VBParser(projectPath);
    const vbProject = await parser.parseVBProject();

    const analyzer = new LegacyCodeAnalyzer(projectPath);
    const analysis = await analyzer.analyze();

    const baseHours = {
      form: 3,
      module: 5,
      class: 2
    };

    let totalHours = 0;
    totalHours += vbProject.forms.length * baseHours.form;
    totalHours += vbProject.modules.length * baseHours.module;
    totalHours += vbProject.classes.length * baseHours.class;

    const estimate = {
      summary: {
        totalEstimatedHours: totalHours,
        complexity: this.assessComplexity(vbProject),
        riskLevel: this.assessRisk(vbProject)
      },
      breakdown: includeDetailedBreakdown ? {
        forms: vbProject.forms.length * baseHours.form,
        modules: vbProject.modules.length * baseHours.module,
        classes: vbProject.classes.length * baseHours.class,
        testing: Math.ceil(totalHours * 0.3),
        integration: 8,
        documentation: 4
      } : null,
      recommendations: [
        'Start with business logic modules as they have fewer UI dependencies',
        'Migrate forms in phases, starting with simpler ones',
        'Consider using automated tools for repetitive conversions',
        'Plan for thorough testing of converted functionality'
      ]
    };

    return estimate;
  }

  private assessComplexity(vbProject: VBProject): string {
    const totalComponents = vbProject.forms.length + vbProject.modules.length + vbProject.classes.length;
    if (totalComponents <= 10) return 'Low';
    if (totalComponents <= 50) return 'Medium';
    if (totalComponents <= 100) return 'High';
    return 'Very High';
  }

  private assessRisk(vbProject: VBProject): string {
    const comComponents = vbProject.references.filter(ref => ref.type === 'COM').length;
    if (comComponents > 0) return 'High';
    if (vbProject.targetFramework === 'VB6') return 'Medium';
    return 'Low';
  }

  // Implementation of new MCP tool handlers
  private async handleAnalyzeVBModuleDetails(args: any): Promise<any> {
    const { filePath, extractBusinessLogic = true, analyzeUIComponents = true } = args;

    if (!await fs.pathExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const analyzer = new VBModuleAnalyzer();
    const analysis = await analyzer.analyzeModule(filePath);

    const result = {
      moduleAnalysis: analysis,
      summary: {
        fileName: analysis.fileName,
        moduleType: analysis.moduleType,
        complexity: analysis.complexity,
        estimatedHours: analysis.estimatedHours,
        linesOfCode: analysis.metrics.linesOfCode,
        cyclomaticComplexity: analysis.metrics.cyclomaticComplexity,
        methodsCount: analysis.methods.length,
        eventsCount: analysis.events.length,
        businessLogicComponents: {
          databaseOperations: analysis.businessLogic.databaseOperations.length,
          fileOperations: analysis.businessLogic.fileOperations.length,
          calculations: analysis.businessLogic.calculations.length,
          validations: analysis.businessLogic.validations.length
        }
      },
      migrationRecommendations: analysis.migrationNotes,
      technicalDebt: analysis.metrics.technicalDebt,
      codeSmells: analysis.metrics.codeSmells
    };

    return result;
  }

  private async handleGenerateModernArchitectureProposal(args: any): Promise<any> {
    const { 
      projectPath, 
      targetArchitecture = 'Clean', 
      includeDatabase = true, 
      modernPatterns = true 
    } = args;

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Parse VB project first
    const parser = new VBParser(projectPath);
    const vbProject = await parser.parseVBProject();

    // Analyze all modules
    const moduleAnalyzer = new VBModuleAnalyzer();
    const moduleAnalyses = [];

    // Analyze all forms
    for (const form of vbProject.forms) {
      try {
        const analysis = await moduleAnalyzer.analyzeModule(form.path);
        moduleAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze form ${form.path}: ${error}`);
      }
    }

    // Analyze all modules
    for (const module of vbProject.modules) {
      try {
        const analysis = await moduleAnalyzer.analyzeModule(module.path);
        moduleAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze module ${module.path}: ${error}`);
      }
    }

    // Analyze all classes
    for (const cls of vbProject.classes) {
      try {
        const analysis = await moduleAnalyzer.analyzeModule(cls.path);
        moduleAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze class ${cls.path}: ${error}`);
      }
    }

    // Generate architecture proposal
    const architectureGenerator = new ModernArchitectureGenerator();
    const proposal = architectureGenerator.generateProposal(
      vbProject,
      moduleAnalyses,
      targetArchitecture as any,
      {
        includeDatabase,
        modernPatterns,
        webBased: targetArchitecture === 'MVC'
      }
    );

    const result = {
      architectureProposal: proposal,
      summary: {
        targetArchitecture: proposal.targetArchitecture,
        projectsCount: proposal.structure.projects.length,
        totalEstimatedDays: proposal.migration.phases.reduce((total, phase) => total + phase.estimatedDays, 0),
        complexModules: moduleAnalyses.filter(m => m.complexity === 'High').length,
        dataAccessModules: moduleAnalyses.filter(m => m.businessLogic.databaseOperations.length > 0).length,
        uiModules: moduleAnalyses.filter(m => m.moduleType === 'Form').length
      },
      sourceAnalysis: {
        totalModules: moduleAnalyses.length,
        totalLinesOfCode: moduleAnalyses.reduce((total, m) => total + m.metrics.linesOfCode, 0),
        totalMethods: moduleAnalyses.reduce((total, m) => total + m.methods.length, 0),
        totalEvents: moduleAnalyses.reduce((total, m) => total + m.events.length, 0),
        businessLogicComplexity: moduleAnalyses.reduce((total, m) => 
          total + m.businessLogic.databaseOperations.length + 
          m.businessLogic.calculations.length + 
          m.businessLogic.validations.length, 0
        )
      }
    };

    return result;
  }

  private async handleMigrateSpecificModule(args: any): Promise<any> {
    const { 
      vbFilePath, 
      targetArchitecture = 'Clean', 
      outputDirectory, 
      generateTests = true, 
      modernizePatterns = true 
    } = args;

    if (!await fs.pathExists(vbFilePath)) {
      throw new Error(`VB file does not exist: ${vbFilePath}`);
    }

    if (!outputDirectory) {
      throw new Error('Output directory is required');
    }

    // Analyze the specific VB module
    const analyzer = new VBModuleAnalyzer();
    const analysis = await analyzer.analyzeModule(vbFilePath);

    // Migrate the module
    const migrator = new ModuleMigrator();
    const migrationResult = await migrator.migrateModule(
      analysis,
      targetArchitecture as any,
      outputDirectory,
      {
        generateTests,
        modernizePatterns,
        targetFramework: 'net8.0'
      }
    );

    const result = {
      migrationResult,
      sourceAnalysis: {
        fileName: analysis.fileName,
        moduleType: analysis.moduleType,
        complexity: analysis.complexity,
        originalLinesOfCode: analysis.metrics.linesOfCode,
        methodsCount: analysis.methods.length,
        eventsCount: analysis.events.length,
        businessLogicComponents: {
          databaseOperations: analysis.businessLogic.databaseOperations.length,
          fileOperations: analysis.businessLogic.fileOperations.length,
          calculations: analysis.businessLogic.calculations.length,
          validations: analysis.businessLogic.validations.length
        }
      },
      migrationSummary: {
        success: migrationResult.success,
        filesGenerated: migrationResult.generatedFiles.length,
        targetArchitecture,
        outputDirectory,
        errors: migrationResult.errors,
        warnings: migrationResult.warnings
      }
    };

    return result;
  }

  private sendResponse(response: MCPResponse): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  async start(): Promise<void> {
    console.error('Legacy VB to C# MCP Server started');
    console.error('Waiting for requests...');
    
    // Send ready signal
    const readyResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: 0,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        }
      }
    };
    
    // Don't exit the process
    setInterval(() => {}, 1000);
  }
}

// If run directly, start the server
if (require.main === module) {
  const server = new LegacyMCPServer();
  server.start().catch(console.error);
}
