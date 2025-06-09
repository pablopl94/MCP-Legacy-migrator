import * as fs from 'fs-extra';
import * as path from 'path';
import * as mustache from 'mustache';
import {
  VBProject,
  VBForm,
  VBClass,
  VBModule,
  VBMethod,
  VBProperty,
  VBVariable,
  VBParameter,
  VBEvent,
  VBControl,
} from '../parsers/vb-parser';
import { MigrationRulesEngine, MigrationContext } from '../migration/rules-engine';
import { EnhancedMigrationEngine } from '../migration/enhanced-rules-engine';

export interface CSharpProject {
  name: string;
  targetFramework: string;
  structure: ProjectStructure;
  files: CSharpFile[];
}

export interface ProjectStructure {
  [path: string]: string[]; // path -> list of files
}

export interface CSharpFile {
  path: string;
  content: string;
  type: 'Form' | 'Class' | 'Interface' | 'Service' | 'Repository' | 'Model' | 'Config';
}

export interface CSharpClass {
  name: string;
  namespace: string;
  inherits?: string;
  implements: string[];
  properties: CSharpProperty[];
  methods: CSharpMethod[];
  fields: CSharpField[];
  constructors: CSharpConstructor[];
  usings: string[];
}

export interface CSharpProperty {
  name: string;
  type: string;
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  hasGetter: boolean;
  hasSetter: boolean;
  isAutoProperty: boolean;
  getterBody?: string;
  setterBody?: string;
}

export interface CSharpMethod {
  name: string;
  returnType: string;
  parameters: CSharpParameter[];
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  isStatic: boolean;
  isAsync: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  body: string;
}

export interface CSharpParameter {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
  isOut?: boolean;
  isRef?: boolean;
}

export interface CSharpField {
  name: string;
  type: string;
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  isStatic: boolean;
  isReadonly: boolean;
  defaultValue?: string;
}

export interface CSharpConstructor {
  parameters: CSharpParameter[];
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  body: string;
}

export class CSharpGenerator {
  private vbProject: VBProject;
  private outputPath: string;
  private templates: Map<string, string> = new Map();
  private migrationEngine: MigrationRulesEngine;
  private enhancedMigrationEngine: EnhancedMigrationEngine;

  constructor(vbProject: VBProject, outputPath: string) {
    this.vbProject = vbProject;
    this.outputPath = outputPath;
    this.migrationEngine = new MigrationRulesEngine();
    this.enhancedMigrationEngine = new EnhancedMigrationEngine();
    this.initializeTemplates();
  }

  async generateProject(): Promise<CSharpProject> {
    const csharpProject: CSharpProject = {
      name: this.vbProject.name,
      targetFramework: this.mapTargetFramework(this.vbProject.targetFramework),
      structure: this.generateProjectStructure(),
      files: [],
    };

    // Generar archivos de proyecto
    csharpProject.files.push(await this.generateSolutionFile());
    csharpProject.files.push(await this.generateMainProjectFile());
    csharpProject.files.push(await this.generateCoreProjectFile());
    csharpProject.files.push(await this.generateDataProjectFile());
    csharpProject.files.push(await this.generateTestProjectFile());

    // Generar modelos desde clases VB
    for (const vbClass of this.vbProject.classes) {
      const modelFile = await this.generateModel(vbClass);
      csharpProject.files.push(modelFile);
    }

    // Generar formularios
    for (const vbForm of this.vbProject.forms) {
      const formFiles = await this.generateForm(vbForm);
      csharpProject.files.push(...formFiles);
    }

    // Generar servicios desde módulos
    for (const vbModule of this.vbProject.modules) {
      const serviceFile = await this.generateService(vbModule);
      csharpProject.files.push(serviceFile);
    }

    // Generar archivos de configuración
    csharpProject.files.push(await this.generateAppConfig());
    csharpProject.files.push(await this.generateProgramFile());

    return csharpProject;
  }

  async writeProjectToDisk(project: CSharpProject): Promise<void> {
    for (const file of project.files) {
      const fullPath = path.join(this.outputPath, file.path);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, file.content, 'utf-8');
    }
  }

  private generateProjectStructure(): ProjectStructure {
    return {
      '': ['README.md', `${this.vbProject.name}.sln`],
      src: [],
      [`src/${this.vbProject.name}.Core`]: ['Models', 'Interfaces', 'Services'],
      [`src/${this.vbProject.name}.Core/Models`]: [],
      [`src/${this.vbProject.name}.Core/Interfaces`]: [],
      [`src/${this.vbProject.name}.Core/Services`]: [],
      [`src/${this.vbProject.name}.Data`]: ['Context', 'Repositories', 'Migrations'],
      [`src/${this.vbProject.name}.Data/Context`]: [],
      [`src/${this.vbProject.name}.Data/Repositories`]: [],
      [`src/${this.vbProject.name}.WinForms`]: ['Forms', 'Controls', 'Views'],
      [`src/${this.vbProject.name}.WinForms/Forms`]: [],
      [`src/${this.vbProject.name}.WinForms/Controls`]: [],
      [`tests/${this.vbProject.name}.Tests`]: ['Unit', 'Integration'],
      [`tests/${this.vbProject.name}.Tests/Unit`]: [],
      [`tests/${this.vbProject.name}.Tests/Integration`]: [],
      docs: [],
      scripts: [],
    };
  }

  private async generateSolutionFile(): Promise<CSharpFile> {
    const template = `
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "{{projectName}}.Core", "src\\{{projectName}}.Core\\{{projectName}}.Core.csproj", "{{{coreGuid}}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "{{projectName}}.Data", "src\\{{projectName}}.Data\\{{projectName}}.Data.csproj", "{{{dataGuid}}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "{{projectName}}.WinForms", "src\\{{projectName}}.WinForms\\{{projectName}}.WinForms.csproj", "{{{winformsGuid}}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "{{projectName}}.Tests", "tests\\{{projectName}}.Tests\\{{projectName}}.Tests.csproj", "{{{testsGuid}}}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
		Release|Any CPU = Release|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
		{{{coreGuid}}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{{{coreGuid}}}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{{{coreGuid}}}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{{{coreGuid}}}.Release|Any CPU.Build.0 = Release|Any CPU
		{{{dataGuid}}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{{{dataGuid}}}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{{{dataGuid}}}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{{{dataGuid}}}.Release|Any CPU.Build.0 = Release|Any CPU
		{{{winformsGuid}}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{{{winformsGuid}}}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{{{winformsGuid}}}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{{{winformsGuid}}}.Release|Any CPU.Build.0 = Release|Any CPU
		{{{testsGuid}}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{{{testsGuid}}}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{{{testsGuid}}}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{{{testsGuid}}}.Release|Any CPU.Build.0 = Release|Any CPU
	EndGlobalSection
EndGlobal
`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
      coreGuid: this.generateGuid(),
      dataGuid: this.generateGuid(),
      winformsGuid: this.generateGuid(),
      testsGuid: this.generateGuid(),
    });

    return {
      path: `${this.vbProject.name}.sln`,
      content: content.trim(),
      type: 'Config',
    };
  }

  private async generateMainProjectFile(): Promise<CSharpFile> {
    const template = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>{{targetFramework}}</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\\{{projectName}}.Core\\{{projectName}}.Core.csproj" />
    <ProjectReference Include="..\\{{projectName}}.Data\\{{projectName}}.Data.csproj" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
    <PackageReference Include="Serilog.Extensions.Logging" Version="8.0.0" />
  </ItemGroup>

</Project>
`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
      targetFramework: this.mapTargetFramework(this.vbProject.targetFramework),
    });

    return {
      path: `src/${this.vbProject.name}.WinForms/${this.vbProject.name}.WinForms.csproj`,
      content: content.trim(),
      type: 'Config',
    };
  }

  private async generateCoreProjectFile(): Promise<CSharpFile> {
    const template = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>{{targetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="8.0.0" />
  </ItemGroup>

</Project>
`;

    const content = mustache.render(template, {
      targetFramework: this.mapTargetFramework(this.vbProject.targetFramework),
    });

    return {
      path: `src/${this.vbProject.name}.Core/${this.vbProject.name}.Core.csproj`,
      content: content.trim(),
      type: 'Config',
    };
  }

  private async generateDataProjectFile(): Promise<CSharpFile> {
    const template = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>{{targetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\\{{projectName}}.Core\\{{projectName}}.Core.csproj" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0" />
  </ItemGroup>

</Project>
`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
      targetFramework: this.mapTargetFramework(this.vbProject.targetFramework),
    });

    return {
      path: `src/${this.vbProject.name}.Data/${this.vbProject.name}.Data.csproj`,
      content: content.trim(),
      type: 'Config',
    };
  }

  private async generateTestProjectFile(): Promise<CSharpFile> {
    const template = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>{{targetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\\..\\src\\{{projectName}}.Core\\{{projectName}}.Core.csproj" />
    <ProjectReference Include="..\\..\\src\\{{projectName}}.Data\\{{projectName}}.Data.csproj" />
    <ProjectReference Include="..\\..\\src\\{{projectName}}.WinForms\\{{projectName}}.WinForms.csproj" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="xunit" Version="2.6.1" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.3" />
    <PackageReference Include="Moq" Version="4.20.69" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
  </ItemGroup>

</Project>
`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
      targetFramework: this.mapTargetFramework(this.vbProject.targetFramework),
    });

    return {
      path: `tests/${this.vbProject.name}.Tests/${this.vbProject.name}.Tests.csproj`,
      content: content.trim(),
      type: 'Config',
    };
  }

  private async generateModel(vbClass: VBClass): Promise<CSharpFile> {
    const csharpClass = this.convertVBClassToCSharp(vbClass);
    const template = this.templates.get('class') || this.getDefaultClassTemplate();

    const content = mustache.render(template, {
      ...csharpClass,
      namespace: `${this.vbProject.name}.Core.Models`,
    });

    return {
      path: `src/${this.vbProject.name}.Core/Models/${vbClass.name}.cs`,
      content: content,
      type: 'Model',
    };
  }

  private async generateForm(vbForm: VBForm): Promise<CSharpFile[]> {
    const files: CSharpFile[] = [];

    // Generar archivo .cs del formulario
    const formClass = this.convertVBFormToCSharpClass(vbForm);
    const classTemplate = this.templates.get('form') || this.getDefaultFormTemplate();

    const classContent = mustache.render(classTemplate, {
      ...formClass,
      namespace: `${this.vbProject.name}.WinForms.Forms`,
    });

    files.push({
      path: `src/${this.vbProject.name}.WinForms/Forms/${vbForm.name}.cs`,
      content: classContent,
      type: 'Form',
    });

    // Generar archivo .Designer.cs
    const designerContent = this.generateDesignerFile(vbForm);
    files.push({
      path: `src/${this.vbProject.name}.WinForms/Forms/${vbForm.name}.Designer.cs`,
      content: designerContent,
      type: 'Form',
    });

    return files;
  }

  private async generateService(vbModule: VBModule): Promise<CSharpFile> {
    const serviceClass = this.convertVBModuleToCSharpService(vbModule);
    const template = this.templates.get('service') || this.getDefaultServiceTemplate();

    const content = mustache.render(template, {
      ...serviceClass,
      namespace: `${this.vbProject.name}.Core.Services`,
    });

    return {
      path: `src/${this.vbProject.name}.Core/Services/${vbModule.name}Service.cs`,
      content: content,
      type: 'Service',
    };
  }

  private async generateAppConfig(): Promise<CSharpFile> {
    const template = `{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\\\mssqllocaldb;Database={{projectName}};Trusted_Connection=true;MultipleActiveResultSets=true"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
    });

    return {
      path: `src/${this.vbProject.name}.WinForms/appsettings.json`,
      content: content,
      type: 'Config',
    };
  }

  private async generateProgramFile(): Promise<CSharpFile> {
    const template = `using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using {{projectName}}.Core.Services;
using {{projectName}}.Data.Context;
using {{projectName}}.WinForms.Forms;

namespace {{projectName}}.WinForms;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var services = new ServiceCollection();
        ConfigureServices(services);

        var serviceProvider = services.BuildServiceProvider();

        var mainForm = serviceProvider.GetRequiredService<MainForm>();
        Application.Run(mainForm);
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // Configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        services.AddSingleton<IConfiguration>(configuration);

        // Logging
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.AddDebug();
        });

        // Services
        {{#services}}
        services.AddScoped<I{{name}}, {{name}}>();
        {{/services}}

        // Forms
        {{#forms}}
        services.AddTransient<{{name}}>();
        {{/forms}}

        // Database Context (if needed)
        // services.AddDbContext<ApplicationDbContext>(options =>
        //     options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));
    }
}`;

    const content = mustache.render(template, {
      projectName: this.vbProject.name,
      services: this.vbProject.modules.map(m => ({ name: m.name + 'Service' })),
      forms: this.vbProject.forms.map(f => ({ name: f.name })),
    });

    return {
      path: `src/${this.vbProject.name}.WinForms/Program.cs`,
      content: content,
      type: 'Config',
    };
  }

  // Métodos de conversión
  private convertVBClassToCSharp(vbClass: VBClass): CSharpClass {
    return {
      name: vbClass.name,
      namespace: `${this.vbProject.name}.Core.Models`,
      inherits: this.mapVBTypeToCSharp(vbClass.inherits),
      implements: vbClass.implements.map(i => this.mapVBTypeToCSharp(i)),
      properties: vbClass.properties.map(p => this.convertVBPropertyToCSharp(p)),
      methods: vbClass.methods.map(m => this.convertVBMethodToCSharp(m)),
      fields: [], // TODO: VBClass.fields not implemented yet
      constructors: [], // TODO: VBClass.constructors not implemented yet
      usings: this.generateUsings(vbClass),
    };
  }

  private convertVBFormToCSharpClass(vbForm: VBForm): CSharpClass {
    const methods = vbForm.events.map(e => this.convertVBEventToCSharpMethod(e));

    return {
      name: vbForm.name,
      namespace: `${this.vbProject.name}.WinForms.Forms`,
      inherits: 'Form',
      implements: [],
      properties: vbForm.properties.map(p => this.convertVBPropertyToCSharp(p)),
      methods: methods,
      fields: vbForm.controls.map(c => this.convertVBControlToCSharpField(c)),
      constructors: [this.generateFormConstructor(vbForm)],
      usings: ['System', 'System.Windows.Forms', 'Microsoft.Extensions.DependencyInjection'],
    };
  }

  private convertVBModuleToCSharpService(vbModule: VBModule): CSharpClass {
    return {
      name: vbModule.name + 'Service',
      namespace: `${this.vbProject.name}.Core.Services`,
      inherits: undefined,
      implements: [`I${vbModule.name}Service`],
      properties: [],
      methods: vbModule.functions.map(f => this.convertVBFunctionToCSharp(f)),
      fields: vbModule.variables
        .filter(v => v.isStatic)
        .map(v => this.convertVBVariableToCSharpField(v)),
      constructors: [],
      usings: [
        'Microsoft.Extensions.Logging',
        ...vbModule.imports.map(i => this.mapVBImportToCSharp(i)),
      ],
    };
  }

  private convertVBPropertyToCSharp(vbProperty: VBProperty): CSharpProperty {
    return {
      name: vbProperty.name,
      type: this.mapVBTypeToCSharp(vbProperty.type),
      accessModifier: vbProperty.isPublic ? 'public' : 'private',
      hasGetter: true,
      hasSetter: !vbProperty.isReadOnly,
      isAutoProperty: !vbProperty.getter && !vbProperty.setter,
      getterBody: vbProperty.getter,
      setterBody: vbProperty.setter,
    };
  }

  private convertVBMethodToCSharp(vbMethod: VBMethod): CSharpMethod {
    // Crear contexto de migración para el método
    const context: MigrationContext = {
      filePath: `${vbMethod.name}.vb`,
      fileContent: vbMethod.body || '',
      projectType: 'WinForms',
      targetFramework: 'net8.0',
      usings: new Set(['System']),
      variables: new Map(),
      functions: new Map(),
    };

    // Aplicar reglas de migración avanzadas
    let methodBody = '// TODO: Implement method body';
    if (vbMethod.body && vbMethod.body.trim() !== '') {
      methodBody = this.migrateVBCodeWithEnhancedEngine(vbMethod.body, `${vbMethod.name}.vb`);
    }

    return {
      name: vbMethod.name,
      returnType: this.mapVBTypeToCSharp(vbMethod.returnType),
      parameters: vbMethod.parameters.map(p => this.convertVBParameterToCSharp(p)),
      accessModifier: vbMethod.isPublic ? 'public' : 'private',
      isStatic: vbMethod.isStatic,
      isAsync: this.detectAsyncPattern(vbMethod.body),
      isVirtual: vbMethod.isOverridable || false,
      isOverride: vbMethod.isOverrides || false,
      body: methodBody,
    };
  }

  private convertVBFunctionToCSharp(vbFunction: VBMethod): CSharpMethod {
    return this.convertVBMethodToCSharp(vbFunction);
  }

  private convertVBParameterToCSharp(vbParam: VBParameter): CSharpParameter {
    return {
      name: vbParam.name,
      type: this.mapVBTypeToCSharp(vbParam.type),
      isOptional: vbParam.isOptional || false,
      defaultValue: vbParam.defaultValue,
      isRef: vbParam.byRef,
      isOut: false,
    };
  }

  private convertVBEventToCSharpMethod(vbEvent: VBEvent): CSharpMethod {
    // Crear contexto de migración
    const context: MigrationContext = {
      filePath: `${vbEvent.handler}.vb`,
      fileContent: vbEvent.body || '',
      projectType: 'WinForms',
      targetFramework: 'net8.0',
      usings: new Set(['System', 'System.Windows.Forms']),
      variables: new Map(),
      functions: new Map(),
    };

    // Aplicar reglas de migración si hay contenido en el evento
    let methodBody = '// TODO: Implement event handler logic';
    if (vbEvent.body && vbEvent.body.trim() !== '') {
      methodBody = this.migrateVBCodeWithEnhancedEngine(vbEvent.body, `${vbEvent.handler}.vb`);
    }

    return {
      name: vbEvent.handler,
      returnType: 'void',
      parameters: [
        { name: 'sender', type: 'object', isOptional: false },
        { name: 'e', type: 'EventArgs', isOptional: false },
      ],
      accessModifier: 'private',
      isStatic: false,
      isAsync: false,
      isVirtual: false,
      isOverride: false,
      body: methodBody,
    };
  }

  private convertVBControlToCSharpField(vbControl: VBControl): CSharpField {
    return {
      name: vbControl.name,
      type: this.mapVBControlTypeToCSharp(vbControl.type),
      accessModifier: 'private',
      isStatic: false,
      isReadonly: false,
    };
  }

  private convertVBVariableToCSharpField(vbVariable: VBVariable): CSharpField {
    return {
      name: vbVariable.name,
      type: this.mapVBTypeToCSharp(vbVariable.type),
      accessModifier: vbVariable.scope.toLowerCase() as any,
      isStatic: vbVariable.isStatic || false,
      isReadonly: false,
      defaultValue: vbVariable.defaultValue,
    };
  }

  private generateFormConstructor(vbForm: VBForm): CSharpConstructor {
    return {
      parameters: [],
      accessModifier: 'public',
      body: 'InitializeComponent();',
    };
  }

  // Métodos de mapeo de tipos
  private mapVBTypeToCSharp(vbType?: string): string {
    if (!vbType) return 'object';

    const typeMap: { [key: string]: string } = {
      String: 'string',
      Integer: 'int',
      Long: 'long',
      Single: 'float',
      Double: 'double',
      Boolean: 'bool',
      Date: 'DateTime',
      Object: 'object',
      Variant: 'object',
      Currency: 'decimal',
      Byte: 'byte',
      Short: 'short',
      Nothing: 'null',
      'System.Windows.Forms.Form': 'Form',
      'System.Data.DataSet': 'DataSet',
      'System.Data.DataTable': 'DataTable',
    };

    return typeMap[vbType] || vbType;
  }

  private mapVBControlTypeToCSharp(vbControlType: string): string {
    const controlMap: { [key: string]: string } = {
      TextBox: 'TextBox',
      Label: 'Label',
      Button: 'Button',
      ListBox: 'ListBox',
      ComboBox: 'ComboBox',
      CheckBox: 'CheckBox',
      RadioButton: 'RadioButton',
      DataGrid: 'DataGridView',
      PictureBox: 'PictureBox',
      Timer: 'Timer',
      MenuStrip: 'MenuStrip',
      ContextMenuStrip: 'ContextMenuStrip',
      ToolStrip: 'ToolStrip',
      StatusStrip: 'StatusStrip',
      Panel: 'Panel',
      GroupBox: 'GroupBox',
      TabControl: 'TabControl',
      TreeView: 'TreeView',
      ListView: 'ListView',
    };

    return controlMap[vbControlType] || vbControlType;
  }

  private mapTargetFramework(vbFramework: string): string {
    if (vbFramework.includes('net48') || vbFramework.includes('4.8')) return 'net8.0-windows';
    if (vbFramework.includes('net47') || vbFramework.includes('4.7')) return 'net8.0-windows';
    if (vbFramework.includes('net46') || vbFramework.includes('4.6')) return 'net8.0-windows';
    if (vbFramework.includes('VB6')) return 'net8.0-windows';

    return 'net8.0-windows';
  }

  private mapVBImportToCSharp(vbImport: string): string {
    const importMap: { [key: string]: string } = {
      'System.Data': 'System.Data',
      'System.IO': 'System.IO',
      'System.Windows.Forms': 'System.Windows.Forms',
      'Microsoft.VisualBasic': 'System',
      'System.Drawing': 'System.Drawing',
    };

    return importMap[vbImport] || vbImport;
  }

  // Conversión de código
  private convertVBCodeToCSharp(vbCode: string): string {
    if (!vbCode) return '// TODO: Implement method body';

    // Crear contexto para el motor de reglas
    const context: MigrationContext = {
      filePath: 'temp.vb',
      fileContent: vbCode,
      projectType: 'WinForms',
      targetFramework: 'net8.0',
      usings: new Set(['System', 'System.Windows.Forms']),
      variables: new Map(),
      functions: new Map(),
    };

    // Aplicar reglas de migración mejoradas
    let csharpCode = this.migrateVBCodeWithEnhancedEngine(vbCode, 'general.vb');

    // Si el resultado es muy corto, intentar conversiones básicas adicionales
    if (csharpCode.length < 10) {
      csharpCode = this.applyBasicConversions(vbCode);
    }

    return `// Migrated from VB.NET\n${csharpCode}`;
  }

  /**
   * Migra código VB usando el motor de reglas mejorado con mejor manejo de lógica de negocio
   */
  private migrateVBCodeWithEnhancedEngine(vbCode: string, filePath: string = ''): string {
    if (!vbCode || vbCode.trim() === '') {
      return '// TODO: Implement method logic';
    }

    try {
      // Usar el motor de reglas mejorado como primera opción
      const enhancedResult = this.enhancedMigrationEngine.migrateVBtoCSharp(vbCode, filePath);

      // Si el motor mejorado produce un resultado significativamente diferente, usarlo
      if (enhancedResult && enhancedResult.length > 10 && enhancedResult !== vbCode) {
        console.log(`Enhanced migration applied for ${filePath}`);
        return enhancedResult;
      }

      // Fallback al motor de reglas original
      const context: MigrationContext = {
        filePath: filePath,
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set(['System', 'System.Windows.Forms']),
        variables: new Map(),
        functions: new Map(),
      };

      const originalResult = this.migrationEngine.applyRules(vbCode, context);

      // Si ninguno de los motores pudo convertir adecuadamente, usar el convertidor básico
      if (originalResult === vbCode) {
        return this.convertVBCodeToCSharp(vbCode);
      }

      return originalResult;
    } catch (error) {
      console.warn(`Error during enhanced migration for ${filePath}:`, error);
      return this.convertVBCodeToCSharp(vbCode);
    }
  }

  private applyBasicConversions(vbCode: string): string {
    let csharpCode = vbCode;

    // Patrones básicos de conversión como respaldo
    const conversions = [
      // Variables que no se capturaron con las reglas principales
      { pattern: /Dim\s+(\w+)\s*$/gm, replacement: 'var $1' },

      // Strings y constantes
      { pattern: /vbCrLf/g, replacement: 'Environment.NewLine' },
      { pattern: /vbTab/g, replacement: '"\\t"' },
      { pattern: /vbNullString/g, replacement: 'string.Empty' },

      // Comparison que no se capturó
      { pattern: /\s*=\s*Nothing/g, replacement: ' == null' },
      { pattern: /\s*<>\s*/g, replacement: ' != ' },

      // Functions adicionales
      { pattern: /Len\s*\(/g, replacement: '.Length(' },
      { pattern: /UCase\s*\(/g, replacement: '.ToUpper(' },
      { pattern: /LCase\s*\(/g, replacement: '.ToLower(' },
      { pattern: /Trim\s*\(/g, replacement: '.Trim(' },
      { pattern: /Left\s*\(([^,]+),\s*(\d+)\)/g, replacement: '$1.Substring(0, $2)' },
      { pattern: /Right\s*\(([^,]+),\s*(\d+)\)/g, replacement: '$1.Substring($1.Length - $2)' },
      { pattern: /Mid\s*\(([^,]+),\s*(\d+)\)/g, replacement: '$1.Substring($2 - 1)' },
      { pattern: /Mid\s*\(([^,]+),\s*(\d+),\s*(\d+)\)/g, replacement: '$1.Substring($2 - 1, $3)' },

      // Control structures adicionales
      { pattern: /Select\s+Case\s+(.+)/g, replacement: 'switch ($1)' },
      { pattern: /Case\s+(.+)/g, replacement: 'case $1:' },
      { pattern: /Case\s+Else/g, replacement: 'default:' },
      { pattern: /End Select/g, replacement: '}' },

      // Exit statements
      { pattern: /Exit\s+Sub/g, replacement: 'return;' },
      { pattern: /Exit\s+Function/g, replacement: 'return;' },
      { pattern: /Exit\s+For/g, replacement: 'break;' },

      // Property access
      { pattern: /\.Text/g, replacement: '.Text' },
      { pattern: /\.Caption/g, replacement: '.Text' },
      { pattern: /\.Value/g, replacement: '.Value' },

      // Error handling adicional
      {
        pattern: /On\s+Error\s+Resume\s+Next/g,
        replacement: '// TODO: Handle errors appropriately',
      },
      { pattern: /On\s+Error\s+GoTo\s+0/g, replacement: '// TODO: Reset error handling' },
    ];

    for (const conv of conversions) {
      csharpCode = csharpCode.replace(conv.pattern, conv.replacement);
    }

    return csharpCode;
  }

  private detectAsyncPattern(vbCode: string): boolean {
    return vbCode.includes('Await') || vbCode.includes('Task') || vbCode.includes('Async');
  }

  private generateUsings(vbClass: VBClass): string[] {
    const usings = new Set(['System']);

    // Agregar usings basados en el contenido
    if (vbClass.inherits?.includes('Form')) {
      usings.add('System.Windows.Forms');
      usings.add('System.Drawing');
    }

    if (vbClass.methods.some(m => m.body?.includes('DataSet') || m.body?.includes('DataTable'))) {
      usings.add('System.Data');
    }

    return Array.from(usings);
  }

  private generateDesignerFile(vbForm: VBForm): string {
    const template = `namespace {{namespace}};

partial class {{className}}
{
    private System.ComponentModel.IContainer components = null;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        {{#controls}}
        this.{{name}} = new {{type}}();
        {{/controls}}
        this.SuspendLayout();
        
        {{#controls}}
        // 
        // {{name}}
        // 
        {{#properties}}
        this.{{../name}}.{{name}} = {{value}};
        {{/properties}}
        
        {{/controls}}
        
        // 
        // {{className}}
        // 
        this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
        this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
        this.ClientSize = new System.Drawing.Size(800, 450);
        {{#controls}}
        this.Controls.Add(this.{{name}});
        {{/controls}}
        this.Name = "{{className}}";
        this.Text = "{{className}}";
        this.ResumeLayout(false);
        this.PerformLayout();
    }

    {{#controls}}
    private {{type}} {{name}};
    {{/controls}}
}`;

    return mustache.render(template, {
      namespace: `${this.vbProject.name}.WinForms.Forms`,
      className: vbForm.name,
      controls: vbForm.controls.map(c => ({
        name: c.name,
        type: this.mapVBControlTypeToCSharp(c.type),
        properties: Object.entries(c.properties).map(([key, value]) => ({
          name: key,
          value: this.formatPropertyValue(value),
        })),
      })),
    });
  }

  private formatPropertyValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }

  // Templates por defecto
  private initializeTemplates(): void {
    this.templates.set('class', this.getDefaultClassTemplate());
    this.templates.set('form', this.getDefaultFormTemplate());
    this.templates.set('service', this.getDefaultServiceTemplate());
  }

  private getDefaultClassTemplate(): string {
    return `{{#usings}}
using {{.}};
{{/usings}}

namespace {{namespace}};

public class {{name}}{{#inherits}} : {{.}}{{/inherits}}{{#implements}}{{#first}} : {{/first}}{{^first}}, {{/first}}{{.}}{{/implements}}
{
    {{#fields}}
    {{accessModifier}}{{#isStatic}} static{{/isStatic}}{{#isReadonly}} readonly{{/isReadonly}} {{type}} {{name}}{{#defaultValue}} = {{.}}{{/defaultValue}};
    {{/fields}}

    {{#constructors}}
    {{accessModifier}} {{../name}}({{#parameters}}{{type}} {{name}}{{#isOptional}} = {{defaultValue}}{{/isOptional}}{{^last}}, {{/last}}{{/parameters}})
    {
        {{body}}
    }
    {{/constructors}}

    {{#properties}}
    {{accessModifier}} {{type}} {{name}} 
    { 
        {{#hasGetter}}get{{#isAutoProperty}};{{/isAutoProperty}}{{^isAutoProperty}} { {{getterBody}} }{{/isAutoProperty}}{{/hasGetter}}
        {{#hasSetter}}set{{#isAutoProperty}};{{/isAutoProperty}}{{^isAutoProperty}} { {{setterBody}} }{{/isAutoProperty}}{{/hasSetter}}
    }
    {{/properties}}

    {{#methods}}
    {{accessModifier}}{{#isStatic}} static{{/isStatic}}{{#isVirtual}} virtual{{/isVirtual}}{{#isOverride}} override{{/isOverride}}{{#isAsync}} async{{/isAsync}} {{returnType}} {{name}}({{#parameters}}{{type}} {{name}}{{#isOptional}} = {{defaultValue}}{{/isOptional}}{{^last}}, {{/last}}{{/parameters}})
    {
        {{body}}
    }
    {{/methods}}
}`;
  }

  private getDefaultFormTemplate(): string {
    return `{{#usings}}
using {{.}};
{{/usings}}

namespace {{namespace}};

public partial class {{name}} : {{inherits}}
{
    {{#constructors}}
    {{accessModifier}} {{../name}}({{#parameters}}{{type}} {{name}}{{^last}}, {{/last}}{{/parameters}})
    {
        {{body}}
    }
    {{/constructors}}

    {{#methods}}
    {{accessModifier}} {{returnType}} {{name}}({{#parameters}}{{type}} {{name}}{{^last}}, {{/last}}{{/parameters}})
    {
        {{body}}
    }
    {{/methods}}
}`;
  }

  private getDefaultServiceTemplate(): string {
    return `{{#usings}}
using {{.}};
{{/usings}}

namespace {{namespace}};

public interface I{{name}}
{
    {{#methods}}
    {{returnType}} {{name}}({{#parameters}}{{type}} {{name}}{{^last}}, {{/last}}{{/parameters}});
    {{/methods}}
}

public class {{name}} : I{{name}}
{
    private readonly ILogger<{{name}}> _logger;

    public {{name}}(ILogger<{{name}}> logger)
    {
        _logger = logger;
    }

    {{#methods}}
    {{accessModifier}} {{returnType}} {{name}}({{#parameters}}{{type}} {{name}}{{^last}}, {{/last}}{{/parameters}})
    {
        {{body}}
    }
    {{/methods}}
}`;
  }

  // Método para generar reporte de migración
  generateMigrationReport(project: CSharpProject): string {
    const report = [];
    report.push('# Reporte de Migración VB.NET a C#');
    report.push(`Proyecto: ${project.name}`);
    report.push(`Framework objetivo: ${project.targetFramework}`);
    report.push('');

    // Estadísticas generales
    const totalFiles = project.files.length;
    const formFiles = project.files.filter(f => f.type === 'Form').length;
    const modelFiles = project.files.filter(f => f.type === 'Model').length;
    const serviceFiles = project.files.filter(f => f.type === 'Service').length;

    report.push('## Estadísticas de Migración');
    report.push(`- Total de archivos generados: ${totalFiles}`);
    report.push(`- Formularios migrados: ${formFiles}`);
    report.push(`- Modelos generados: ${modelFiles}`);
    report.push(`- Servicios generados: ${serviceFiles}`);
    report.push('');

    // Análisis de lógica migrada
    report.push('## Análisis de Lógica de Negocio');
    let totalMethods = 0;
    let migratedMethods = 0;
    let todoMethods = 0;

    for (const file of project.files) {
      if (file.type === 'Form' || file.type === 'Service') {
        const methodMatches = file.content.match(/(public|private|protected)\s+\w+\s+\w+\s*\(/g);
        if (methodMatches) {
          totalMethods += methodMatches.length;

          // Contar métodos con lógica migrada vs TODOs
          const todoMatches = file.content.match(/\/\/ TODO:/g);
          const currentTodos = todoMatches ? todoMatches.length : 0;
          todoMethods += currentTodos;
          migratedMethods += methodMatches.length - currentTodos;
        }
      }
    }

    report.push(`- Total de métodos analizados: ${totalMethods}`);
    report.push(`- Métodos con lógica migrada: ${migratedMethods}`);
    report.push(`- Métodos pendientes (TODOs): ${todoMethods}`);

    if (totalMethods > 0) {
      const migrationPercentage = ((migratedMethods / totalMethods) * 100).toFixed(1);
      report.push(`- Porcentaje de migración: ${migrationPercentage}%`);
    }

    report.push('');

    // Recomendaciones
    report.push('## Recomendaciones');
    if (todoMethods > 0) {
      report.push('- Revisar y completar la migración de métodos marcados con TODO');
    }
    if (formFiles > 0) {
      report.push('- Probar la funcionalidad de formularios WinForms migrados');
    }
    report.push('- Ejecutar pruebas unitarias para validar la migración');
    report.push('- Revisar configuraciones de base de datos si aplica');

    return report.join('\n');
  }
}
