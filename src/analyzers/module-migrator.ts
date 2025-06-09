import { VBModuleAnalysis } from './vb-module-analyzer';
import { EnhancedMigrationEngine } from '../migration/enhanced-rules-engine';
import { MigrationContext } from '../migration/rules-engine';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface MigrationResult {
  success: boolean;
  generatedFiles: GeneratedFile[];
  errors: string[];
  warnings: string[];
  summary: {
    originalLinesOfCode: number;
    generatedLinesOfCode: number;
    migratedMethods: number;
    migratedEvents: number;
    businessLogicComponents: number;
  };
}

export interface GeneratedFile {
  path: string;
  type: 'Model' | 'Service' | 'Controller' | 'View' | 'ViewModel' | 'Repository' | 'Test';
  purpose: string;
  content: string;
  sourceModule: string;
}

export class ModuleMigrator {
  private enhancedEngine: EnhancedMigrationEngine;

  constructor() {
    this.enhancedEngine = new EnhancedMigrationEngine();
  }

  async migrateModule(
    analysis: VBModuleAnalysis,
    targetArchitecture: 'Clean' | 'Layered' | 'MVC' | 'MVVM',
    outputDirectory: string,
    options: {
      generateTests: boolean;
      modernizePatterns: boolean;
      targetFramework: string;
    } = {
      generateTests: true,
      modernizePatterns: true,
      targetFramework: 'net8.0'
    }
  ): Promise<MigrationResult> {
    
    const result: MigrationResult = {
      success: false,
      generatedFiles: [],
      errors: [],
      warnings: [],
      summary: {
        originalLinesOfCode: analysis.metrics.linesOfCode,
        generatedLinesOfCode: 0,
        migratedMethods: 0,
        migratedEvents: 0,
        businessLogicComponents: 0
      }
    };

    try {
      // Ensure output directory exists
      await fs.ensureDir(outputDirectory);

      // Read original VB file
      const originalContent = await fs.readFile(analysis.filePath, 'utf8');

      // Generate files based on target architecture
      switch (targetArchitecture) {
        case 'Clean':
          await this.generateCleanArchitectureFiles(analysis, originalContent, outputDirectory, options, result);
          break;
        case 'Layered':
          await this.generateLayeredArchitectureFiles(analysis, originalContent, outputDirectory, options, result);
          break;
        case 'MVC':
          await this.generateMVCFiles(analysis, originalContent, outputDirectory, options, result);
          break;
        case 'MVVM':
          await this.generateMVVMFiles(analysis, originalContent, outputDirectory, options, result);
          break;
      }

      // Generate tests if requested
      if (options.generateTests) {
        await this.generateTests(analysis, outputDirectory, result);
      }

      // Write all generated files to disk
      await this.writeGeneratedFiles(result.generatedFiles, outputDirectory);

      // Calculate summary
      result.summary.generatedLinesOfCode = result.generatedFiles.reduce(
        (total, file) => total + file.content.split('\n').length, 0
      );
      result.summary.migratedMethods = analysis.methods.length;
      result.summary.migratedEvents = analysis.events.length;
      result.summary.businessLogicComponents = 
        analysis.businessLogic.databaseOperations.length +
        analysis.businessLogic.calculations.length +
        analysis.businessLogic.validations.length;

      result.success = true;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  private async generateCleanArchitectureFiles(
    analysis: VBModuleAnalysis,
    originalContent: string,
    outputDirectory: string,
    options: any,
    result: MigrationResult
  ): Promise<void> {
    
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const namespace = this.generateNamespace(baseName);

    // Generate Domain Entity (if business logic exists)
    if (this.hasBusinessLogic(analysis)) {
      const entity = this.generateDomainEntity(analysis, namespace, originalContent);
      result.generatedFiles.push({
        path: `Domain/Entities/${baseName}Entity.cs`,
        type: 'Model',
        purpose: 'Domain entity with business rules',
        content: entity,
        sourceModule: analysis.fileName
      });
    }

    // Generate Application Service
    const service = this.generateApplicationService(analysis, namespace, originalContent, options);
    result.generatedFiles.push({
      path: `Application/Services/${baseName}Service.cs`,
      type: 'Service',
      purpose: 'Application service with use cases',
      content: service,
      sourceModule: analysis.fileName
    });

    // Generate Repository interface and implementation (if data access exists)
    if (analysis.businessLogic.databaseOperations.length > 0) {
      const repositoryInterface = this.generateRepositoryInterface(analysis, namespace);
      const repositoryImplementation = this.generateRepositoryImplementation(analysis, namespace, originalContent);
      
      result.generatedFiles.push({
        path: `Application/Interfaces/I${baseName}Repository.cs`,
        type: 'Repository',
        purpose: 'Repository interface for data access',
        content: repositoryInterface,
        sourceModule: analysis.fileName
      });
      
      result.generatedFiles.push({
        path: `Infrastructure/Repositories/${baseName}Repository.cs`,
        type: 'Repository',
        purpose: 'Repository implementation with EF Core',
        content: repositoryImplementation,
        sourceModule: analysis.fileName
      });
    }

    // Generate Controller/View (if it's a Form)
    if (analysis.moduleType === 'Form') {
      const controller = this.generateController(analysis, namespace, originalContent, options);
      result.generatedFiles.push({
        path: `Presentation/Controllers/${baseName}Controller.cs`,
        type: 'Controller',
        purpose: 'MVC controller for UI logic',
        content: controller,
        sourceModule: analysis.fileName
      });

      // Generate View Models
      const viewModel = this.generateViewModel(analysis, namespace);
      result.generatedFiles.push({
        path: `Presentation/ViewModels/${baseName}ViewModel.cs`,
        type: 'ViewModel',
        purpose: 'View model for data binding',
        content: viewModel,
        sourceModule: analysis.fileName
      });
    }
  }

  private async generateLayeredArchitectureFiles(
    analysis: VBModuleAnalysis,
    originalContent: string,
    outputDirectory: string,
    options: any,
    result: MigrationResult
  ): Promise<void> {
    
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const namespace = this.generateNamespace(baseName);

    // Business Logic Layer
    const businessLogic = this.generateBusinessLogicClass(analysis, namespace, originalContent, options);
    result.generatedFiles.push({
      path: `Business/${baseName}BusinessLogic.cs`,
      type: 'Service',
      purpose: 'Business logic implementation',
      content: businessLogic,
      sourceModule: analysis.fileName
    });

    // Data Access Layer
    if (analysis.businessLogic.databaseOperations.length > 0) {
      const dataAccess = this.generateDataAccessClass(analysis, namespace, originalContent);
      result.generatedFiles.push({
        path: `Data/${baseName}DataAccess.cs`,
        type: 'Repository',
        purpose: 'Data access implementation',
        content: dataAccess,
        sourceModule: analysis.fileName
      });
    }

    // Presentation Layer
    if (analysis.moduleType === 'Form') {
      const presenter = this.generatePresenter(analysis, namespace, originalContent);
      result.generatedFiles.push({
        path: `Presentation/${baseName}Presenter.cs`,
        type: 'Controller',
        purpose: 'Presentation logic',
        content: presenter,
        sourceModule: analysis.fileName
      });
    }
  }

  private async generateMVCFiles(
    analysis: VBModuleAnalysis,
    originalContent: string,
    outputDirectory: string,
    options: any,
    result: MigrationResult
  ): Promise<void> {
    
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const namespace = this.generateNamespace(baseName);

    // Model
    const model = this.generateModel(analysis, namespace);
    result.generatedFiles.push({
      path: `Models/${baseName}Model.cs`,
      type: 'Model',
      purpose: 'Data model',
      content: model,
      sourceModule: analysis.fileName
    });

    // Controller
    const controller = this.generateMVCController(analysis, namespace, originalContent, options);
    result.generatedFiles.push({
      path: `Controllers/${baseName}Controller.cs`,
      type: 'Controller',
      purpose: 'MVC controller',
      content: controller,
      sourceModule: analysis.fileName
    });

    // Views (if Form)
    if (analysis.moduleType === 'Form') {
      const views = this.generateMVCViews(analysis, baseName);
      views.forEach(view => {
        result.generatedFiles.push({
          path: `Views/${baseName}/${view.name}.cshtml`,
          type: 'View',
          purpose: view.purpose,
          content: view.content,
          sourceModule: analysis.fileName
        });
      });
    }
  }

  private async generateMVVMFiles(
    analysis: VBModuleAnalysis,
    originalContent: string,
    outputDirectory: string,
    options: any,
    result: MigrationResult
  ): Promise<void> {
    
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const namespace = this.generateNamespace(baseName);

    // Model
    const model = this.generateModel(analysis, namespace);
    result.generatedFiles.push({
      path: `Models/${baseName}Model.cs`,
      type: 'Model',
      purpose: 'Data model',
      content: model,
      sourceModule: analysis.fileName
    });

    // ViewModel
    const viewModel = this.generateMVVMViewModel(analysis, namespace, originalContent, options);
    result.generatedFiles.push({
      path: `ViewModels/${baseName}ViewModel.cs`,
      type: 'ViewModel',
      purpose: 'MVVM view model with commands and properties',
      content: viewModel,
      sourceModule: analysis.fileName
    });

    // Service
    if (this.hasBusinessLogic(analysis)) {
      const service = this.generateMVVMService(analysis, namespace, originalContent, options);
      result.generatedFiles.push({
        path: `Services/${baseName}Service.cs`,
        type: 'Service',
        purpose: 'Business service for view model',
        content: service,
        sourceModule: analysis.fileName
      });
    }

    // View (XAML)
    if (analysis.moduleType === 'Form') {
      const view = this.generateXAMLView(analysis, baseName);
      result.generatedFiles.push({
        path: `Views/${baseName}View.xaml`,
        type: 'View',
        purpose: 'WPF/UWP view',
        content: view,
        sourceModule: analysis.fileName
      });
    }
  }

  private async generateTests(
    analysis: VBModuleAnalysis,
    outputDirectory: string,
    result: MigrationResult
  ): Promise<void> {
    
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const namespace = this.generateNamespace(baseName);

    if (this.hasBusinessLogic(analysis)) {
      const unitTests = this.generateUnitTests(analysis, namespace);
      result.generatedFiles.push({
        path: `Tests/${baseName}Tests.cs`,
        type: 'Test',
        purpose: 'Unit tests for business logic',
        content: unitTests,
        sourceModule: analysis.fileName
      });
    }
  }

  // Code generation methods
  
  private generateDomainEntity(analysis: VBModuleAnalysis, namespace: string, originalContent: string): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const context: MigrationContext = this.createMigrationContext(analysis, originalContent);
    
    const properties = analysis.variables
      .filter(v => v.visibility === 'Public' || v.scope === 'Module')
      .map(v => this.generateProperty(v.name, this.mapVBTypeToCSharp(v.type)))
      .join('\n\n    ');

    const businessMethods = analysis.methods
      .filter(m => m.visibility === 'Public')
      .map(m => this.migrateMeTODo(m, context))
      .join('\n\n    ');

    return `using System;\nusing System.ComponentModel.DataAnnotations;\n\nnamespace ${namespace}.Domain.Entities\n{\n    public class ${baseName}Entity\n    {\n        ${properties}\n\n        ${businessMethods}\n    }\n}`;
  }

  private generateApplicationService(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const context: MigrationContext = this.createMigrationContext(analysis, originalContent);
    
    const serviceMethods = analysis.methods
      .map(m => this.migrateMethodToService(m, context, options))
      .join('\n\n        ');

    const dependencies = this.generateServiceDependencies(analysis);
    const constructor = this.generateServiceConstructor(baseName, dependencies);

    return `using System;\nusing System.Threading.Tasks;\nusing ${namespace}.Domain.Entities;\nusing ${namespace}.Application.Interfaces;\n\nnamespace ${namespace}.Application.Services\n{\n    public class ${baseName}Service\n    {\n        ${dependencies}\n\n        ${constructor}\n\n        ${serviceMethods}\n    }\n}`;
  }

  private generateRepositoryInterface(analysis: VBModuleAnalysis, namespace: string): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    
    const methods = analysis.businessLogic.databaseOperations
      .map(op => this.generateRepositoryMethodSignature(op))
      .join('\n        ');

    return `using System;\nusing System.Collections.Generic;\nusing System.Threading.Tasks;\nusing ${namespace}.Domain.Entities;\n\nnamespace ${namespace}.Application.Interfaces\n{\n    public interface I${baseName}Repository\n    {\n        ${methods}\n    }\n}`;
  }

  private generateRepositoryImplementation(analysis: VBModuleAnalysis, namespace: string, originalContent: string): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const context: MigrationContext = this.createMigrationContext(analysis, originalContent);
    
    const methods = analysis.businessLogic.databaseOperations
      .map(op => this.generateRepositoryMethodImplementation(op, context))
      .join('\n\n        ');

    return `using System;\nusing System.Collections.Generic;\nusing System.Linq;\nusing System.Threading.Tasks;\nusing Microsoft.EntityFrameworkCore;\nusing ${namespace}.Domain.Entities;\nusing ${namespace}.Application.Interfaces;\n\nnamespace ${namespace}.Infrastructure.Repositories\n{\n    public class ${baseName}Repository : I${baseName}Repository\n    {\n        private readonly ApplicationDbContext _context;\n\n        public ${baseName}Repository(ApplicationDbContext context)\n        {\n            _context = context;\n        }\n\n        ${methods}\n    }\n}`;
  }

  private generateController(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    const context: MigrationContext = this.createMigrationContext(analysis, originalContent);
    
    const actions = analysis.events
      .filter(e => e.eventType === 'Click' || e.eventType === 'Load')
      .map(e => this.generateControllerAction(e, context, options))
      .join('\n\n        ');

    return `using Microsoft.AspNetCore.Mvc;\nusing ${namespace}.Application.Services;\nusing ${namespace}.Presentation.ViewModels;\n\nnamespace ${namespace}.Presentation.Controllers\n{\n    public class ${baseName}Controller : Controller\n    {\n        private readonly ${baseName}Service _service;\n\n        public ${baseName}Controller(${baseName}Service service)\n        {\n            _service = service;\n        }\n\n        ${actions}\n    }\n}`;
  }

  private generateViewModel(analysis: VBModuleAnalysis, namespace: string): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    
    const properties = analysis.variables
      .filter(v => v.visibility === 'Public')
      .map(v => this.generateViewModelProperty(v.name, this.mapVBTypeToCSharp(v.type)))
      .join('\n\n        ');

    return `using System.ComponentModel;\nusing System.ComponentModel.DataAnnotations;\n\nnamespace ${namespace}.Presentation.ViewModels\n{\n    public class ${baseName}ViewModel : INotifyPropertyChanged\n    {\n        ${properties}\n\n        public event PropertyChangedEventHandler PropertyChanged;\n\n        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)\n        {\n            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));\n        }\n    }\n}`;
  }

  private generateUnitTests(analysis: VBModuleAnalysis, namespace: string): string {
    const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
    
    const testMethods = analysis.methods
      .filter(m => this.isBusinessLogicMethod(m))
      .map(m => this.generateTestMethod(m, baseName))
      .join('\n\n        ');

    return `using Xunit;\nusing Moq;\nusing FluentAssertions;\nusing ${namespace}.Application.Services;\nusing ${namespace}.Domain.Entities;\n\nnamespace ${namespace}.Tests.Unit\n{\n    public class ${baseName}ServiceTests\n    {\n        private readonly ${baseName}Service _service;\n        private readonly Mock<I${baseName}Repository> _repositoryMock;\n\n        public ${baseName}ServiceTests()\n        {\n            _repositoryMock = new Mock<I${baseName}Repository>();\n            _service = new ${baseName}Service(_repositoryMock.Object);\n        }\n\n        ${testMethods}\n    }\n}`;
  }

  // Helper methods

  private createMigrationContext(analysis: VBModuleAnalysis, originalContent: string): MigrationContext {
    return {
      filePath: analysis.filePath,
      fileContent: originalContent,
      projectType: 'WinForms',
      targetFramework: 'net8.0',
      usings: new Set(['System', 'System.Threading.Tasks']),
      variables: new Map(),
      functions: new Map()
    };
  }

  private hasBusinessLogic(analysis: VBModuleAnalysis): boolean {
    return analysis.businessLogic.calculations.length > 0 ||
           analysis.businessLogic.validations.length > 0 ||
           analysis.businessLogic.databaseOperations.length > 0 ||
           analysis.methods.some(m => this.isBusinessLogicMethod(m));
  }

  private isBusinessLogicMethod(method: any): boolean {
    return method.body.includes('Calculate') ||
           method.body.includes('Validate') ||
           method.body.includes('Process') ||
           method.body.includes('If') ||
           method.body.includes('Select');
  }

  private generateNamespace(baseName: string): string {
    return `Company.${baseName}`;
  }

  private mapVBTypeToCSharp(vbType: string): string {
    const typeMap: { [key: string]: string } = {
      'String': 'string',
      'Integer': 'int',
      'Long': 'long',
      'Double': 'double',
      'Single': 'float',
      'Boolean': 'bool',
      'Date': 'DateTime',
      'Variant': 'object',
      'Object': 'object'
    };
    return typeMap[vbType] || vbType;
  }

  private generateProperty(name: string, type: string): string {
    return `public ${type} ${name} { get; set; }`;
  }

  private generateViewModelProperty(name: string, type: string): string {
    return `private ${type} _${name.toLowerCase()};\n        public ${type} ${name}\n        {\n            get => _${name.toLowerCase()};\n            set\n            {\n                _${name.toLowerCase()} = value;\n                OnPropertyChanged();\n            }\n        }`;
  }

  private async writeGeneratedFiles(files: GeneratedFile[], outputDirectory: string): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(outputDirectory, file.path);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, file.content, 'utf8');
    }
  }

  // Placeholder methods for complex generation logic
  private migrateMeTODo(method: any, context: MigrationContext): string {
    const convertedBody = this.enhancedEngine.migrateVBtoCSharp(method.body, method.filePath);
    return `public ${this.mapVBTypeToCSharp(method.returnType)} ${method.name}(${this.generateParameterList(method.parameters)})\n        {\n            ${convertedBody}\n        }`;
  }

  private migrateMethodToService(method: any, context: MigrationContext, options: any): string {
    const convertedBody = this.enhancedEngine.migrateVBtoCSharp(method.body, method.filePath);
    const asyncModifier = options.modernizePatterns ? 'async Task<' : '';
    const returnType = options.modernizePatterns ? `${asyncModifier}${this.mapVBTypeToCSharp(method.returnType)}>` : this.mapVBTypeToCSharp(method.returnType);
    
    return `public ${returnType} ${method.name}Async(${this.generateParameterList(method.parameters)})\n        {\n            ${convertedBody}\n        }`;
  }

  private generateParameterList(parameters: any[]): string {
    return parameters.map(p => `${this.mapVBTypeToCSharp(p.type)} ${p.name}`).join(', ');
  }

  private generateServiceDependencies(analysis: VBModuleAnalysis): string {
    const dependencies: string[] = [];
    
    if (analysis.businessLogic.databaseOperations.length > 0) {
      const baseName = path.basename(analysis.fileName, path.extname(analysis.fileName));
      dependencies.push(`private readonly I${baseName}Repository _repository;`);
    }
    
    return dependencies.join('\n        ');
  }

  private generateServiceConstructor(baseName: string, dependencies: string): string {
    if (!dependencies) {
      return `public ${baseName}Service()\n        {\n        }`;
    }
    
    return `public ${baseName}Service(I${baseName}Repository repository)\n        {\n            _repository = repository;\n        }`;
  }

  private generateRepositoryMethodSignature(operation: any): string {
    switch (operation.type) {
      case 'Select':
        return `Task<IEnumerable<Entity>> GetAllAsync();`;
      case 'Insert':
        return `Task<Entity> CreateAsync(Entity entity);`;
      case 'Update':
        return `Task<Entity> UpdateAsync(Entity entity);`;
      case 'Delete':
        return `Task DeleteAsync(int id);`;
      default:
        return `Task ExecuteAsync(string query);`;
    }
  }

  private generateRepositoryMethodImplementation(operation: any, context: MigrationContext): string {
    const convertedQuery = this.enhancedEngine.migrateVBtoCSharp(operation.query, operation.filePath);
    
    switch (operation.type) {
      case 'Select':
        return `public async Task<IEnumerable<Entity>> GetAllAsync()\n        {\n            return await _context.Entities.ToListAsync();\n        }`;
      case 'Insert':
        return `public async Task<Entity> CreateAsync(Entity entity)\n        {\n            _context.Entities.Add(entity);\n            await _context.SaveChangesAsync();\n            return entity;\n        }`;
      default:
        return `public async Task ExecuteAsync(string query)\n        {\n            // TODO: Implement ${operation.type} operation\n            // Original query: ${operation.query}\n        }`;
    }
  }

  private generateControllerAction(event: any, context: MigrationContext, options: any): string {
    const convertedBody = this.enhancedEngine.migrateVBtoCSharp(event.body, event.filePath);
    const actionName = event.eventType === 'Load' ? 'Index' : event.name.replace('_Click', '');
    
    return `public IActionResult ${actionName}()\n        {\n            ${convertedBody}\n            return View();\n        }`;
  }

  private generateTestMethod(method: any, baseName: string): string {
    return `[Fact]\n        public async Task ${method.name}_ShouldReturnExpectedResult()\n        {\n            // Arrange\n            // TODO: Setup test data\n\n            // Act\n            var result = await _service.${method.name}Async();\n\n            // Assert\n            result.Should().NotBeNull();\n            // TODO: Add specific assertions\n        }`;
  }

  // Placeholder implementations for other generation methods
  private generateBusinessLogicClass(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    return `// Business logic class for ${analysis.fileName}`;
  }

  private generateDataAccessClass(analysis: VBModuleAnalysis, namespace: string, originalContent: string): string {
    return `// Data access class for ${analysis.fileName}`;
  }

  private generatePresenter(analysis: VBModuleAnalysis, namespace: string, originalContent: string): string {
    return `// Presenter class for ${analysis.fileName}`;
  }

  private generateModel(analysis: VBModuleAnalysis, namespace: string): string {
    return `// Model class for ${analysis.fileName}`;
  }

  private generateMVCController(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    return `// MVC controller for ${analysis.fileName}`;
  }

  private generateMVCViews(analysis: VBModuleAnalysis, baseName: string): Array<{name: string, purpose: string, content: string}> {
    return [{
      name: 'Index',
      purpose: 'Main view',
      content: `<!-- Main view for ${baseName} -->`
    }];
  }

  private generateMVVMViewModel(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    return `// MVVM view model for ${analysis.fileName}`;
  }

  private generateMVVMService(analysis: VBModuleAnalysis, namespace: string, originalContent: string, options: any): string {
    return `// MVVM service for ${analysis.fileName}`;
  }

  private generateXAMLView(analysis: VBModuleAnalysis, baseName: string): string {
    return `<!-- XAML view for ${baseName} -->`;
  }
}