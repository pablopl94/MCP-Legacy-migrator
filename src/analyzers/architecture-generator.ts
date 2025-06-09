import { VBProject } from '../parsers/vb-parser';
import { VBModuleAnalysis } from './vb-module-analyzer';

export interface ArchitectureProposal {
  targetArchitecture: 'Clean' | 'Layered' | 'MVC' | 'MVVM' | 'Microservices';
  
  structure: {
    projects: ProjectProposal[];
    sharedLibraries: SharedLibrary[];
  };
  
  patterns: {
    designPatterns: string[];
    architecturalPatterns: string[];
    dataAccessPatterns: string[];
  };
  
  technologies: {
    frontend: TechnologyStack;
    backend: TechnologyStack;
    database: TechnologyStack;
    testing: TechnologyStack;
  };
  
  migration: {
    phases: MigrationPhase[];
    priorities: string[];
    dependencies: Dependency[];
  };
  
  modernization: {
    recommendations: string[];
    bestPractices: string[];
    securityConsiderations: string[];
  };
}

export interface ProjectProposal {
  name: string;
  type: 'Console' | 'Web' | 'Desktop' | 'API' | 'Library' | 'Service';
  targetFramework: string;
  purpose: string;
  dependencies: string[];
  sourceModules: string[]; // Original VB modules that map to this project
}

export interface SharedLibrary {
  name: string;
  purpose: string;
  types: string[];
}

export interface TechnologyStack {
  primary: string;
  secondary: string[];
  justification: string;
}

export interface MigrationPhase {
  name: string;
  order: number;
  description: string;
  modules: string[];
  estimatedDays: number;
  dependencies: string[];
  risks: string[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'Data' | 'Service' | 'UI' | 'Business';
  description: string;
}

export class ModernArchitectureGenerator {
  generateProposal(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    targetArchitecture: 'Clean' | 'Layered' | 'MVC' | 'MVVM' | 'Microservices' = 'Clean',
    options: {
      includeDatabase: boolean;
      modernPatterns: boolean;
      webBased: boolean;
    } = { includeDatabase: true, modernPatterns: true, webBased: false }
  ): ArchitectureProposal {
    const proposal: ArchitectureProposal = {
      targetArchitecture,
      structure: this.generateStructure(vbProject, moduleAnalyses, targetArchitecture, options),
      patterns: this.recommendPatterns(targetArchitecture, options),
      technologies: this.recommendTechnologies(vbProject, moduleAnalyses, options),
      migration: this.planMigration(vbProject, moduleAnalyses),
      modernization: this.generateModernizationPlan(vbProject, moduleAnalyses)
    };
    return proposal;
  }

  private generateStructure(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    targetArchitecture: string,
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    switch (targetArchitecture) {
      case 'Clean':
        return this.generateCleanArchitecture(vbProject, moduleAnalyses, options);
      case 'Layered':
        return this.generateLayeredArchitecture(vbProject, moduleAnalyses, options);
      case 'MVC':
        return this.generateMVCArchitecture(vbProject, moduleAnalyses, options);
      case 'MVVM':
        return this.generateMVVMArchitecture(vbProject, moduleAnalyses, options);
      case 'Microservices':
        return this.generateMicroservicesArchitecture(vbProject, moduleAnalyses, options);
      default:
        return this.generateCleanArchitecture(vbProject, moduleAnalyses, options);
    }
  }

  private generateCleanArchitecture(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    const projects: ProjectProposal[] = [];
    const sharedLibraries: SharedLibrary[] = [];
    projects.push({
      name: `${vbProject.name}.Domain`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Domain entities, value objects, and business rules',
      dependencies: [],
      sourceModules: this.getBusinessLogicModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Application`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Use cases, services, and application logic',
      dependencies: [`${vbProject.name}.Domain`],
      sourceModules: this.getApplicationModules(moduleAnalyses)
    });
    if (options.includeDatabase || this.hasDataAccess(moduleAnalyses)) {
      projects.push({
        name: `${vbProject.name}.Infrastructure`,
        type: 'Library',
        targetFramework: 'net8.0',
        purpose: 'Data access, external services, and infrastructure concerns',
        dependencies: [`${vbProject.name}.Domain`, `${vbProject.name}.Application`],
        sourceModules: this.getDataAccessModules(moduleAnalyses)
      });
    }
    const uiType = options.webBased ? 'Web' : 'Desktop';
    projects.push({
      name: `${vbProject.name}.${uiType}`,
      type: uiType,
      targetFramework: 'net8.0',
      purpose: `${uiType} user interface and controllers`,
      dependencies: [
        `${vbProject.name}.Application`,
        options.includeDatabase ? `${vbProject.name}.Infrastructure` : ''
      ].filter(Boolean),
      sourceModules: this.getUIModules(moduleAnalyses)
    });
    if (options.webBased) {
      projects.push({
        name: `${vbProject.name}.Api`,
        type: 'API',
        targetFramework: 'net8.0',
        purpose: 'REST API endpoints and controllers',
        dependencies: [`${vbProject.name}.Application`, `${vbProject.name}.Infrastructure`],
        sourceModules: []
      });
    }
    projects.push({
      name: `${vbProject.name}.Tests.Unit`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Unit tests for business logic',
      dependencies: [`${vbProject.name}.Domain`, `${vbProject.name}.Application`],
      sourceModules: []
    });
    sharedLibraries.push({
      name: `${vbProject.name}.Shared`,
      purpose: 'Common utilities, extensions, and shared types',
      types: ['DTOs', 'Extensions', 'Constants', 'Utilities']
    });
    return { projects, sharedLibraries };
  }

  private generateLayeredArchitecture(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    const projects: ProjectProposal[] = [];
    const sharedLibraries: SharedLibrary[] = [];
    projects.push({
      name: `${vbProject.name}.Presentation`,
      type: options.webBased ? 'Web' : 'Desktop',
      targetFramework: 'net8.0',
      purpose: 'User interface and presentation logic',
      dependencies: [`${vbProject.name}.Business`],
      sourceModules: this.getUIModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Business`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Business logic and rules',
      dependencies: [`${vbProject.name}.Data`],
      sourceModules: this.getBusinessLogicModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Data`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Data access and persistence',
      dependencies: [],
      sourceModules: this.getDataAccessModules(moduleAnalyses)
    });
    return { projects, sharedLibraries };
  }

  private generateMVCArchitecture(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    const projects: ProjectProposal[] = [];
    const sharedLibraries: SharedLibrary[] = [];
    projects.push({
      name: `${vbProject.name}.Web`,
      type: 'Web',
      targetFramework: 'net8.0',
      purpose: 'ASP.NET Core MVC web application',
      dependencies: [`${vbProject.name}.Models`, `${vbProject.name}.Services`],
      sourceModules: this.getUIModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Models`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Data models and view models',
      dependencies: [],
      sourceModules: this.getDataModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Services`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Business services and data access',
      dependencies: [`${vbProject.name}.Models`],
      sourceModules: this.getBusinessLogicModules(moduleAnalyses)
    });
    return { projects, sharedLibraries };
  }

  private generateMVVMArchitecture(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    const projects: ProjectProposal[] = [];
    const sharedLibraries: SharedLibrary[] = [];
    projects.push({
      name: `${vbProject.name}.Desktop`,
      type: 'Desktop',
      targetFramework: 'net8.0-windows',
      purpose: 'WPF/WinUI MVVM desktop application',
      dependencies: [`${vbProject.name}.ViewModels`, `${vbProject.name}.Services`],
      sourceModules: this.getUIModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.ViewModels`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'View models and UI logic',
      dependencies: [`${vbProject.name}.Models`, `${vbProject.name}.Services`],
      sourceModules: this.getUILogicModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Models`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Data models and business entities',
      dependencies: [],
      sourceModules: this.getDataModules(moduleAnalyses)
    });
    projects.push({
      name: `${vbProject.name}.Services`,
      type: 'Library',
      targetFramework: 'net8.0',
      purpose: 'Business services and data access',
      dependencies: [`${vbProject.name}.Models`],
      sourceModules: this.getBusinessLogicModules(moduleAnalyses)
    });
    return { projects, sharedLibraries };
  }

  private generateMicroservicesArchitecture(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): { projects: ProjectProposal[]; sharedLibraries: SharedLibrary[] } {
    const projects: ProjectProposal[] = [];
    const sharedLibraries: SharedLibrary[] = [];
    const businessDomains = this.identifyBusinessDomains(moduleAnalyses);
    businessDomains.forEach(domain => {
      projects.push({
        name: `${vbProject.name}.${domain.name}Service`,
        type: 'API',
        targetFramework: 'net8.0',
        purpose: `Microservice for ${domain.name} domain`,
        dependencies: [`${vbProject.name}.Shared`],
        sourceModules: domain.modules
      });
    });
    projects.push({
      name: `${vbProject.name}.Gateway`,
      type: 'API',
      targetFramework: 'net8.0',
      purpose: 'API Gateway for routing and cross-cutting concerns',
      dependencies: [],
      sourceModules: []
    });
    projects.push({
      name: `${vbProject.name}.Web`,
      type: 'Web',
      targetFramework: 'net8.0',
      purpose: 'Web frontend consuming microservices',
      dependencies: [],
      sourceModules: this.getUIModules(moduleAnalyses)
    });
    return { projects, sharedLibraries };
  }

  private recommendPatterns(targetArchitecture: string, options: any): {
    designPatterns: string[];
    architecturalPatterns: string[];
    dataAccessPatterns: string[];
  } {
    const patterns: {
      designPatterns: string[];
      architecturalPatterns: string[];
      dataAccessPatterns: string[];
    } = {
      designPatterns: [
        'Dependency Injection',
        'Factory Pattern',
        'Repository Pattern',
        'Unit of Work',
        'Strategy Pattern'
      ],
      architecturalPatterns: [],
      dataAccessPatterns: []
    };
    switch (targetArchitecture) {
      case 'Clean':
        patterns.architecturalPatterns = ['CQRS', 'Mediator', 'Domain Events'];
        break;
      case 'MVVM':
        patterns.architecturalPatterns = ['Command Pattern', 'Observer Pattern', 'Data Binding'];
        break;
      case 'MVC':
        patterns.architecturalPatterns = ['MVC', 'Front Controller', 'View Component'];
        break;
      case 'Microservices':
        patterns.architecturalPatterns = ['API Gateway', 'Service Discovery', 'Circuit Breaker'];
        break;
    }
    if (options.includeDatabase) {
      patterns.dataAccessPatterns = [
        'Entity Framework Core',
        'Repository Pattern',
        'Unit of Work',
        'Database Migrations'
      ];
    }
    return patterns;
  }

  private recommendTechnologies(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[],
    options: any
  ): {
    frontend: TechnologyStack;
    backend: TechnologyStack;
    database: TechnologyStack;
    testing: TechnologyStack;
  } {
    const hasFormsUI = moduleAnalyses.some(m => m.moduleType === 'Form');
    const hasDataAccess = this.hasDataAccess(moduleAnalyses);
    return {
      frontend: {
        primary: options.webBased ? 'ASP.NET Core MVC' : (hasFormsUI ? 'WPF' : 'Console'),
        secondary: options.webBased ? ['Blazor', 'React', 'Angular'] : ['WinUI 3', 'MAUI'],
        justification: options.webBased ? 'Modern web UI with server-side rendering' : 'Rich desktop experience with modern XAML'
      },
      backend: {
        primary: '.NET 8',
        secondary: ['ASP.NET Core', 'Entity Framework Core', 'AutoMapper'],
        justification: 'Latest .NET with high performance and cross-platform support'
      },
      database: {
        primary: hasDataAccess ? 'SQL Server' : 'None',
        secondary: hasDataAccess ? ['Entity Framework Core', 'Dapper', 'Azure SQL'] : [],
        justification: hasDataAccess ? 'Enterprise-grade relational database with ORM support' : 'No database requirements detected'
      },
      testing: {
        primary: 'xUnit',
        secondary: ['Moq', 'FluentAssertions', 'AutoFixture'],
        justification: 'Modern testing framework with rich ecosystem'
      }
    };
  }

  private planMigration(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[]
  ): {
    phases: MigrationPhase[];
    priorities: string[];
    dependencies: Dependency[];
  } {
    const phases: MigrationPhase[] = [];
    const priorities: string[] = [];
    const dependencies: Dependency[] = [];
    const businessModules = this.getBusinessLogicModules(moduleAnalyses);
    if (businessModules.length > 0) {
      phases.push({
        name: 'Core Business Logic',
        order: 1,
        description: 'Migrate core business rules and calculations',
        modules: businessModules,
        estimatedDays: Math.ceil(businessModules.length * 2),
        dependencies: [],
        risks: ['Business logic complexity', 'Hidden dependencies']
      });
    }
    const dataModules = this.getDataAccessModules(moduleAnalyses);
    if (dataModules.length > 0) {
      phases.push({
        name: 'Data Access Layer',
        order: 2,
        description: 'Migrate database operations and data models',
        modules: dataModules,
        estimatedDays: Math.ceil(dataModules.length * 3),
        dependencies: ['Core Business Logic'],
        risks: ['Database schema changes', 'Data migration complexity']
      });
    }
    const uiModules = this.getUIModules(moduleAnalyses);
    if (uiModules.length > 0) {
      phases.push({
        name: 'User Interface',
        order: 3,
        description: 'Migrate forms and user interface components',
        modules: uiModules,
        estimatedDays: Math.ceil(uiModules.length * 4),
        dependencies: ['Core Business Logic', 'Data Access Layer'],
        risks: ['UI framework differences', 'User experience changes']
      });
    }
    phases.push({
      name: 'Integration and Testing',
      order: 4,
      description: 'Integration testing and system validation',
      modules: [],
      estimatedDays: 10,
      dependencies: ['User Interface'],
      risks: ['Integration issues', 'Performance problems']
    });
    priorities.push('Migrate data layer first to ensure data integrity');
    priorities.push('Focus on high-value business logic modules');
    priorities.push('Maintain backward compatibility during transition');
    priorities.push('Implement comprehensive testing at each phase');
    return { phases, priorities, dependencies };
  }

  private generateModernizationPlan(
    vbProject: VBProject,
    moduleAnalyses: VBModuleAnalysis[]
  ): {
    recommendations: string[];
    bestPractices: string[];
    securityConsiderations: string[];
  } {
    const recommendations: string[] = [];
    const bestPractices: string[] = [];
    const securityConsiderations: string[] = [];
    recommendations.push('Implement dependency injection for better testability');
    recommendations.push('Use async/await patterns for I/O operations');
    recommendations.push('Apply SOLID principles in the new architecture');
    recommendations.push('Implement comprehensive logging and monitoring');
    recommendations.push('Use configuration management for environment-specific settings');
    if (this.hasDataAccess(moduleAnalyses)) {
      recommendations.push('Replace ADO/DAO with Entity Framework Core');
      recommendations.push('Implement database migrations for schema management');
    }
    bestPractices.push('Use meaningful naming conventions');
    bestPractices.push('Implement proper error handling and logging');
    bestPractices.push('Write unit tests for all business logic');
    bestPractices.push('Use Git for version control with feature branches');
    bestPractices.push('Implement CI/CD pipelines for automated deployment');
    bestPractices.push('Document APIs and architecture decisions');
    securityConsiderations.push('Implement input validation and sanitization');
    securityConsiderations.push('Use parameterized queries to prevent SQL injection');
    securityConsiderations.push('Implement proper authentication and authorization');
    securityConsiderations.push('Encrypt sensitive data at rest and in transit');
    securityConsiderations.push('Keep dependencies up to date for security patches');
    securityConsiderations.push('Implement proper session management');
    return { recommendations, bestPractices, securityConsiderations };
  }

  private getBusinessLogicModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.moduleType === 'Module' || m.moduleType === 'Class' || (m.businessLogic.calculations.length > 0 || m.businessLogic.validations.length > 0))
      .map(m => m.fileName);
  }

  private getApplicationModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.methods.length > 0 && m.moduleType !== 'Form')
      .map(m => m.fileName);
  }

  private getDataAccessModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.businessLogic.databaseOperations.length > 0)
      .map(m => m.fileName);
  }

  private getUIModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.moduleType === 'Form')
      .map(m => m.fileName);
  }

  private getUILogicModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.moduleType === 'Form' && m.events.length > 0)
      .map(m => m.fileName);
  }

  private getDataModules(moduleAnalyses: VBModuleAnalysis[]): string[] {
    return moduleAnalyses
      .filter(m => m.variables.some(v => v.type.includes('String') || v.type.includes('Integer') || v.type.includes('Date')) || m.businessLogic.databaseOperations.length > 0)
      .map(m => m.fileName);
  }

  private hasDataAccess(moduleAnalyses: VBModuleAnalysis[]): boolean {
    return moduleAnalyses.some(m => m.businessLogic.databaseOperations.length > 0);
  }

  private identifyBusinessDomains(moduleAnalyses: VBModuleAnalysis[]): Array<{ name: string; modules: string[] }> {
    const domains: Array<{ name: string; modules: string[] }> = [];
    const groups = new Map<string, string[]>();
    moduleAnalyses.forEach(m => {
      const baseName = m.fileName.replace(/\d+$/, '').replace(/Form|Module/, '');
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }
      groups.get(baseName)!.push(m.fileName);
    });
    groups.forEach((modules, name) => {
      if (modules.length > 1) {
        domains.push({ name: name || 'Core', modules });
      }
    });
    if (domains.length === 0) {
      domains.push({
        name: 'Core',
        modules: moduleAnalyses.map(m => m.fileName)
      });
    }
    return domains;
  }
}