import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { glob } from 'glob';

export interface VBProject {
  name: string;
  path: string;
  targetFramework: string;
  forms: VBForm[];
  modules: VBModule[];
  classes: VBClass[];
  references: VBReference[];
  projectType: 'WinForms' | 'Console' | 'Library' | 'WebForms';
}

export interface VBForm {
  name: string;
  path: string;
  controls: VBControl[];
  events: VBEvent[];
  properties: VBProperty[];
  codeFile?: string;
}

export interface VBModule {
  name: string;
  path: string;
  functions: VBFunction[];
  variables: VBVariable[];
  imports: string[];
}

export interface VBClass {
  name: string;
  path: string;
  inherits?: string;
  implements: string[];
  properties: VBProperty[];
  methods: VBMethod[];
  events: VBEvent[];
}

export interface VBControl {
  name: string;
  type: string;
  properties: { [key: string]: any };
  events: VBEvent[];
}

export interface VBEvent {
  name: string;
  handler: string;
  parameters: VBParameter[];
  body?: string; // Código del manejador de eventos
}

export interface VBFunction {
  name: string;
  returnType: string;
  parameters: VBParameter[];
  isPublic: boolean;
  isStatic: boolean;
  body: string;
}

export interface VBMethod extends VBFunction {
  isOverridable?: boolean;
  isOverrides?: boolean;
}

export interface VBProperty {
  name: string;
  type: string;
  getter?: string;
  setter?: string;
  isPublic: boolean;
  isReadOnly?: boolean;
}

export interface VBVariable {
  name: string;
  type: string;
  scope: 'Private' | 'Public' | 'Protected' | 'Friend';
  isStatic?: boolean;
  defaultValue?: string;
}

export interface VBParameter {
  name: string;
  type: string;
  isOptional?: boolean;
  defaultValue?: string;
  byRef?: boolean;
}

export interface VBReference {
  name: string;
  type: 'Assembly' | 'COM' | 'Project';
  version?: string;
  path?: string;
}

export class VBParser {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async parseVBProject(): Promise<VBProject> {
    const projectFiles = await this.findProjectFiles();

    if (projectFiles.length === 0) {
      throw new Error('No VB.NET project files found in the specified directory');
    }

    // Analizar el primer archivo de proyecto encontrado
    const projectFile = projectFiles[0];
    const projectData = await this.parseProjectFile(projectFile);

    return projectData;
  }

  private async findProjectFiles(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob(
        '**/*.{vbproj,vbp}',
        {
          cwd: this.projectPath,
          ignore: ['node_modules/**', 'bin/**', 'obj/**'],
        },
        (err, files) => {
          if (err) reject(err);
          else resolve(files);
        }
      );
    });
  }

  private async parseProjectFile(projectFile: string): Promise<VBProject> {
    const fullPath = path.join(this.projectPath, projectFile);
    const content = await fs.readFile(fullPath, 'utf-8');

    if (projectFile.endsWith('.vbproj')) {
      return await this.parseVBProjFile(content, projectFile);
    } else {
      return await this.parseVBPFile(content, projectFile);
    }
  }

  private async parseVBProjFile(content: string, projectFile: string): Promise<VBProject> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    const project: VBProject = {
      name: path.basename(projectFile, '.vbproj'),
      path: projectFile,
      targetFramework: this.extractTargetFramework(result),
      forms: [],
      modules: [],
      classes: [],
      references: await this.extractReferences(result),
      projectType: this.determineProjectType(result),
    };

    // Buscar y parsear archivos VB
    const vbFiles = await this.findVBFiles();

    for (const vbFile of vbFiles) {
      await this.parseVBFile(vbFile, project);
    }

    return project;
  }

  private async parseVBPFile(content: string, projectFile: string): Promise<VBProject> {
    // Parser para proyectos VB6 legacy (.vbp)
    const lines = content.split('\n');
    const project: VBProject = {
      name: path.basename(projectFile, '.vbp'),
      path: projectFile,
      targetFramework: 'VB6',
      forms: [],
      modules: [],
      classes: [],
      references: [],
      projectType: 'WinForms',
    };

    for (const line of lines) {
      if (line.startsWith('Form=')) {
        const formPath = line.split('=')[1].split(';')[0];
        await this.parseVBForm(formPath, project);
      } else if (line.startsWith('Module=')) {
        const modulePath = line.split('=')[1].split(';')[0];
        await this.parseVBModule(modulePath, project);
      } else if (line.startsWith('Class=')) {
        const classPath = line.split('=')[1].split(';')[0];
        await this.parseVBClass(classPath, project);
      }
    }

    return project;
  }

  private async findVBFiles(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob(
        '**/*.{vb,frm,bas,cls}',
        {
          cwd: this.projectPath,
          ignore: ['node_modules/**', 'bin/**', 'obj/**'],
        },
        (err, files) => {
          if (err) reject(err);
          else resolve(files);
        }
      );
    });
  }

  private async parseVBFile(filePath: string, project: VBProject): Promise<void> {
    const fullPath = path.join(this.projectPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.vb':
        await this.parseVBCodeFile(content, filePath, project);
        break;
      case '.frm':
        await this.parseVBForm(filePath, project);
        break;
      case '.bas':
        await this.parseVBModule(filePath, project);
        break;
      case '.cls':
        await this.parseVBClass(filePath, project);
        break;
    }
  }

  private async parseVBCodeFile(
    content: string,
    filePath: string,
    project: VBProject
  ): Promise<void> {
    // Determinar tipo de archivo VB.NET por contenido
    if (
      content.includes('Public Class') &&
      content.includes('Inherits System.Windows.Forms.Form')
    ) {
      const form = await this.extractFormFromCode(content, filePath);
      project.forms.push(form);
    } else if (content.includes('Public Class') || content.includes('Public MustInherit Class')) {
      const cls = await this.extractClassFromCode(content, filePath);
      project.classes.push(cls);
    } else if (content.includes('Module ')) {
      const module = await this.extractModuleFromCode(content, filePath);
      project.modules.push(module);
    }
  }

  private async parseVBForm(formPath: string, project: VBProject): Promise<void> {
    const fullPath = path.join(this.projectPath, formPath);

    if (!(await fs.pathExists(fullPath))) {
      console.warn(`Form file not found: ${fullPath}`);
      return;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const form = await this.extractFormFromCode(content, formPath);
    project.forms.push(form);
  }

  private async parseVBModule(modulePath: string, project: VBProject): Promise<void> {
    const fullPath = path.join(this.projectPath, modulePath);

    if (!(await fs.pathExists(fullPath))) {
      console.warn(`Module file not found: ${fullPath}`);
      return;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const module = await this.extractModuleFromCode(content, modulePath);
    project.modules.push(module);
  }

  private async parseVBClass(classPath: string, project: VBProject): Promise<void> {
    const fullPath = path.join(this.projectPath, classPath);

    if (!(await fs.pathExists(fullPath))) {
      console.warn(`Class file not found: ${fullPath}`);
      return;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const cls = await this.extractClassFromCode(content, classPath);
    project.classes.push(cls);
  }

  private async extractFormFromCode(content: string, filePath: string): Promise<VBForm> {
    const form: VBForm = {
      name: this.extractClassName(content) || path.basename(filePath, path.extname(filePath)),
      path: filePath,
      controls: this.extractControls(content),
      events: this.extractEvents(content),
      properties: this.extractProperties(content),
    };

    return form;
  }

  private async extractModuleFromCode(content: string, filePath: string): Promise<VBModule> {
    const module: VBModule = {
      name: this.extractModuleName(content) || path.basename(filePath, path.extname(filePath)),
      path: filePath,
      functions: this.extractFunctions(content),
      variables: this.extractVariables(content),
      imports: this.extractImports(content),
    };

    return module;
  }

  private async extractClassFromCode(content: string, filePath: string): Promise<VBClass> {
    const cls: VBClass = {
      name: this.extractClassName(content) || path.basename(filePath, path.extname(filePath)),
      path: filePath,
      inherits: this.extractInherits(content),
      implements: this.extractImplements(content),
      properties: this.extractProperties(content),
      methods: this.extractMethods(content),
      events: this.extractEvents(content),
    };

    return cls;
  }

  // Métodos de extracción específicos
  private extractTargetFramework(projectXml: any): string {
    try {
      const props = projectXml.Project?.PropertyGroup;
      if (Array.isArray(props)) {
        for (const prop of props) {
          if (prop.TargetFramework?.[0]) {
            return prop.TargetFramework[0];
          }
        }
      } else if (props?.TargetFramework?.[0]) {
        return props.TargetFramework[0];
      }
    } catch (error) {
      console.warn('Could not extract target framework:', error);
    }
    return 'net48'; // Default
  }

  private async extractReferences(projectXml: any): Promise<VBReference[]> {
    const references: VBReference[] = [];

    try {
      const itemGroups = projectXml.Project?.ItemGroup;
      if (!itemGroups) return references;

      const groups = Array.isArray(itemGroups) ? itemGroups : [itemGroups];

      for (const group of groups) {
        // Referencias de assembly
        if (group.Reference) {
          const refs = Array.isArray(group.Reference) ? group.Reference : [group.Reference];
          for (const ref of refs) {
            references.push({
              name: ref.$.Include || 'Unknown',
              type: 'Assembly',
              version: ref.HintPath?.[0] || undefined,
            });
          }
        }

        // Referencias COM
        if (group.COMReference) {
          const comRefs = Array.isArray(group.COMReference)
            ? group.COMReference
            : [group.COMReference];
          for (const ref of comRefs) {
            references.push({
              name: ref.$.Include || 'Unknown COM',
              type: 'COM',
              version: ref.VersionMajor?.[0] + '.' + ref.VersionMinor?.[0],
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not extract references:', error);
    }

    return references;
  }

  private determineProjectType(projectXml: any): 'WinForms' | 'Console' | 'Library' | 'WebForms' {
    try {
      const outputType = projectXml.Project?.PropertyGroup?.OutputType?.[0];
      const useWPF = projectXml.Project?.PropertyGroup?.UseWPF?.[0];
      const useWindowsForms = projectXml.Project?.PropertyGroup?.UseWindowsForms?.[0];

      if (useWPF === 'true') return 'WinForms'; // WPF tratado como WinForms para migración
      if (useWindowsForms === 'true') return 'WinForms';
      if (outputType === 'Exe') return 'Console';
      if (outputType === 'Library') return 'Library';
    } catch (error) {
      console.warn('Could not determine project type:', error);
    }

    return 'WinForms'; // Default
  }

  // Métodos de parsing de código VB
  private extractClassName(content: string): string | null {
    const match = content.match(/(?:Public\s+|Private\s+)?Class\s+(\w+)/i);
    return match ? match[1] : null;
  }

  private extractModuleName(content: string): string | null {
    const match = content.match(/Module\s+(\w+)/i);
    return match ? match[1] : null;
  }

  private extractControls(content: string): VBControl[] {
    const controls: VBControl[] = [];
    const regex =
      /(?:Friend\s+|Private\s+|Protected\s+)?WithEvents\s+(\w+)\s+As\s+(\w+(?:\.\w+)*)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      controls.push({
        name: match[1],
        type: match[2],
        properties: {},
        events: [],
      });
    }

    return controls;
  }

  private extractEvents(content: string): VBEvent[] {
    const events: VBEvent[] = [];
    const regex =
      /(?:Private\s+|Public\s+)?Sub\s+(\w+)_(\w+)\((.*?)\)\s*(?:Handles\s+[^\r\n]+)?\s*\r?\n([\s\S]*?)\r?\nEnd Sub/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      events.push({
        name: match[2],
        handler: match[1] + '_' + match[2],
        parameters: this.parseParameters(match[3]),
        body: match[4]?.trim(), // Extraer el cuerpo del evento
      });
    }

    return events;
  }

  private extractProperties(content: string): VBProperty[] {
    const properties: VBProperty[] = [];
    const regex =
      /(?:Public\s+|Private\s+|Protected\s+)?Property\s+(\w+)\(\)\s+As\s+(\w+)[\s\S]*?End Property/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      properties.push({
        name: match[1],
        type: match[2],
        isPublic: content.includes('Public Property ' + match[1]),
      });
    }

    return properties;
  }

  private extractFunctions(content: string): VBFunction[] {
    const functions: VBFunction[] = [];
    const regex =
      /(?:Public\s+|Private\s+|Protected\s+)?(?:Shared\s+)?Function\s+(\w+)\((.*?)\)\s+As\s+(\w+)\s*\r?\n([\s\S]*?)\r?\nEnd Function/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const funcName = match[1];
      const isPublic =
        content.includes('Public Function ' + funcName) ||
        content.includes('Public Shared Function ' + funcName);
      const isStatic = content.includes('Shared Function ' + funcName);

      functions.push({
        name: funcName,
        returnType: match[3],
        parameters: this.parseParameters(match[2]),
        isPublic: isPublic,
        isStatic: isStatic,
        body: match[4]?.trim() || '', // Extraer el cuerpo de la función
      });
    }

    return functions;
  }

  private extractMethods(content: string): VBMethod[] {
    const methods: VBMethod[] = [];

    // Funciones
    const functions = this.extractFunctions(content);
    methods.push(...functions.map(f => ({ ...f })));

    // Subs
    const subRegex =
      /(?:Public\s+|Private\s+|Protected\s+)?(?:Shared\s+)?Sub\s+(\w+)\((.*?)\)\s*\r?\n([\s\S]*?)\r?\nEnd Sub/gi;
    let match;

    while ((match = subRegex.exec(content)) !== null) {
      const subName = match[1];
      const isPublic =
        content.includes('Public Sub ' + subName) ||
        content.includes('Public Shared Sub ' + subName);
      const isStatic = content.includes('Shared Sub ' + subName);

      methods.push({
        name: subName,
        returnType: 'void',
        parameters: this.parseParameters(match[2]),
        isPublic: isPublic,
        isStatic: isStatic,
        body: match[3]?.trim() || '', // Extraer el cuerpo del método
      });
    }

    return methods;
  }

  private extractVariables(content: string): VBVariable[] {
    const variables: VBVariable[] = [];
    const regex =
      /(Public|Private|Protected|Friend)(?:\s+Shared)?\s+(\w+)\s+As\s+(\w+)(?:\s*=\s*([^\r\n]+))?/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.push({
        name: match[2],
        type: match[3],
        scope: match[1] as any,
        isStatic: content.includes('Shared ' + match[2]),
        defaultValue: match[4]?.trim(),
      });
    }

    return variables;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /Imports\s+([\w.]+)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractInherits(content: string): string | undefined {
    const match = content.match(/Inherits\s+([\w.]+)/i);
    return match ? match[1] : undefined;
  }

  private extractImplements(content: string): string[] {
    const implementsList: string[] = [];
    const regex = /Implements\s+([\w.]+)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      implementsList.push(match[1]);
    }

    return implementsList;
  }

  private parseParameters(paramString: string): VBParameter[] {
    if (!paramString.trim()) return [];

    const params: VBParameter[] = [];
    const paramParts = paramString.split(',');

    for (const part of paramParts) {
      const trimmed = part.trim();
      const match = trimmed.match(
        /(?:(ByRef|ByVal)\s+)?(?:Optional\s+)?(\w+)\s+As\s+(\w+)(?:\s*=\s*([^,]+))?/i
      );

      if (match) {
        params.push({
          name: match[2],
          type: match[3],
          byRef: match[1]?.toLowerCase() === 'byref',
          isOptional: trimmed.includes('Optional'),
          defaultValue: match[4]?.trim(),
        });
      }
    }

    return params;
  }
}
