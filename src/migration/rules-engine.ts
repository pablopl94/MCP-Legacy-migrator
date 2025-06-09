export interface MigrationRule {
  id: string;
  name: string;
  description: string;
  category: 'Syntax' | 'DataTypes' | 'Controls' | 'Functions' | 'Patterns' | 'Framework';
  priority: number; // 1-10, higher = applied first
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  conditions?: MigrationCondition[];
  examples?: MigrationExample[];
}

export interface MigrationCondition {
  type: 'contains' | 'not_contains' | 'file_extension' | 'project_type';
  value: string;
}

export interface MigrationExample {
  before: string;
  after: string;
  description: string;
}

export interface MigrationContext {
  filePath: string;
  fileContent: string;
  projectType: string;
  targetFramework: string;
  usings: Set<string>;
  variables: Map<string, string>; // name -> type
  functions: Map<string, string>; // name -> return type
}

export class MigrationRulesEngine {
  private rules: MigrationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  applyRules(content: string, context: MigrationContext): string {
    let result = content;
    const appliedRules: string[] = [];

    // Ordenar reglas por prioridad
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.shouldApplyRule(rule, context)) {
        const before = result;
        result = this.applyRule(rule, result, context);

        if (result !== before) {
          appliedRules.push(rule.id);
        }
      }
    }

    return result;
  }

  private shouldApplyRule(rule: MigrationRule, context: MigrationContext): boolean {
    if (!rule.conditions) return true;

    for (const condition of rule.conditions) {
      switch (condition.type) {
        case 'contains':
          if (!context.fileContent.includes(condition.value)) return false;
          break;
        case 'not_contains':
          if (context.fileContent.includes(condition.value)) return false;
          break;
        case 'file_extension':
          if (!context.filePath.endsWith(condition.value)) return false;
          break;
        case 'project_type':
          if (context.projectType !== condition.value) return false;
          break;
      }
    }

    return true;
  }

  private applyRule(rule: MigrationRule, content: string, context: MigrationContext): string {
    if (typeof rule.replacement === 'string') {
      return content.replace(rule.pattern, rule.replacement);
    } else {
      return content.replace(rule.pattern, rule.replacement);
    }
  }

  private initializeRules(): void {
    this.rules = [
      // Basic VB.NET to C# conversion rules
      {
        id: 'vb-dim-declaration',
        name: 'Dim Variable Declaration',
        description: 'Convert VB Dim statements to C# variable declarations',
        category: 'Syntax',
        priority: 10,
        pattern: /Dim\s+(\w+)\s+As\s+(\w+)/g,
        replacement: '$2 $1',
        examples: [
          {
            before: 'Dim nombre As String',
            after: 'string nombre',
            description: 'Basic variable declaration',
          },
        ],
      },

      // Object instantiation
      {
        id: 'vb-new-object',
        name: 'New Object Creation',
        description: 'Convert VB New object creation to C#',
        category: 'Syntax',
        priority: 10,
        pattern: /Dim\s+(\w+)\s+As\s+New\s+(\w+)\s*\((.*?)\)/g,
        replacement: 'var $1 = new $2($3)',
        examples: [
          {
            before: 'Dim lista As New List(Of String)()',
            after: 'var lista = new List<string>()',
            description: 'Object instantiation',
          },
        ],
      },

      // Control structures
      {
        id: 'vb-if-then',
        name: 'If-Then Statement',
        description: 'Convert VB If-Then to C# if statement',
        category: 'Syntax',
        priority: 9,
        pattern: /If\s+(.+?)\s+Then/g,
        replacement: 'if ($1)',
        examples: [
          {
            before: 'If x > 5 Then',
            after: 'if (x > 5)',
            description: 'Basic if statement',
          },
        ],
      },

      {
        id: 'vb-elseif',
        name: 'ElseIf Statement',
        description: 'Convert VB ElseIf to C# else if',
        category: 'Syntax',
        priority: 9,
        pattern: /ElseIf\s+(.+?)\s+Then/g,
        replacement: 'else if ($1)',
        examples: [
          {
            before: 'ElseIf x < 0 Then',
            after: 'else if (x < 0)',
            description: 'ElseIf conversion',
          },
        ],
      },

      {
        id: 'vb-end-if',
        name: 'End If Statement',
        description: 'Convert VB End If to C# closing brace',
        category: 'Syntax',
        priority: 8,
        pattern: /End If/g,
        replacement: '}',
        examples: [
          {
            before: 'End If',
            after: '}',
            description: 'Block closing',
          },
        ],
      },

      // Data types
      {
        id: 'vb-string-type',
        name: 'String Type',
        description: 'Convert VB String to C# string',
        category: 'DataTypes',
        priority: 9,
        pattern: /\bString\b/g,
        replacement: 'string',
        examples: [
          {
            before: 'String nombre',
            after: 'string nombre',
            description: 'String type conversion',
          },
        ],
      },

      {
        id: 'vb-integer-type',
        name: 'Integer Type',
        description: 'Convert VB Integer to C# int',
        category: 'DataTypes',
        priority: 9,
        pattern: /\bInteger\b/g,
        replacement: 'int',
        examples: [
          {
            before: 'Integer edad',
            after: 'int edad',
            description: 'Integer type conversion',
          },
        ],
      },

      {
        id: 'vb-boolean-type',
        name: 'Boolean Type',
        description: 'Convert VB Boolean to C# bool',
        category: 'DataTypes',
        priority: 9,
        pattern: /\bBoolean\b/g,
        replacement: 'bool',
        examples: [
          {
            before: 'Boolean activo',
            after: 'bool activo',
            description: 'Boolean type conversion',
          },
        ],
      },

      // Operators
      {
        id: 'vb-string-concat',
        name: 'String Concatenation',
        description: 'Convert VB & operator to C# + operator',
        category: 'Syntax',
        priority: 8,
        pattern: /\s+&\s+/g,
        replacement: ' + ',
        examples: [
          {
            before: 'resultado = "Hola" & " Mundo"',
            after: 'resultado = "Hola" + " Mundo"',
            description: 'String concatenation',
          },
        ],
      },

      {
        id: 'vb-logical-and',
        name: 'Logical AND',
        description: 'Convert VB And to C# &&',
        category: 'Syntax',
        priority: 8,
        pattern: /\bAnd\b/g,
        replacement: '&&',
        examples: [
          {
            before: 'If x > 0 And y < 10 Then',
            after: 'if (x > 0 && y < 10)',
            description: 'Logical AND operator',
          },
        ],
      },

      {
        id: 'vb-logical-or',
        name: 'Logical OR',
        description: 'Convert VB Or to C# ||',
        category: 'Syntax',
        priority: 8,
        pattern: /\bOr\b/g,
        replacement: '||',
        examples: [
          {
            before: 'If x < 0 Or y > 10 Then',
            after: 'if (x < 0 || y > 10)',
            description: 'Logical OR operator',
          },
        ],
      },

      {
        id: 'vb-logical-not',
        name: 'Logical NOT',
        description: 'Convert VB Not to C# !',
        category: 'Syntax',
        priority: 8,
        pattern: /\bNot\s+/g,
        replacement: '!',
        examples: [
          {
            before: 'If Not esValido Then',
            after: 'if (!esValido)',
            description: 'Logical NOT operator',
          },
        ],
      },

      // Functions
      {
        id: 'vb-msgbox',
        name: 'MsgBox Function',
        description: 'Convert VB MsgBox to C# MessageBox.Show',
        category: 'Functions',
        priority: 7,
        pattern: /MsgBox\s*\(/g,
        replacement: 'MessageBox.Show(',
        examples: [
          {
            before: 'MsgBox("Hola Mundo")',
            after: 'MessageBox.Show("Hola Mundo")',
            description: 'Message box display',
          },
        ],
      },

      // Comments
      {
        id: 'vb-comments',
        name: 'Comments',
        description: 'Convert VB single quote comments to C# double slash',
        category: 'Syntax',
        priority: 5,
        pattern: /^(\s*)'/gm,
        replacement: '$1//',
        examples: [
          {
            before: "' This is a comment",
            after: '// This is a comment',
            description: 'Single line comment',
          },
        ],
      },

      // NUEVAS REGLAS AVANZADAS PARA LÓGICA DE NEGOCIO

      // Method declarations with body
      {
        id: 'vb-method-with-body',
        name: 'Method Declaration with Body',
        description: 'Convert VB method declarations with complete body',
        category: 'Functions',
        priority: 10,
        pattern:
          /(Private|Public|Protected|Friend)\s+(Sub|Function)\s+(\w+)\s*\((.*?)\)(\s+As\s+(\w+))?\s*\n([\s\S]*?)\nEnd\s+(Sub|Function)/gm,
        replacement: (match: string, ...groups: string[]) => {
          const [, accessibility, methodType, methodName, parameters, , returnType, body] = groups;
          const csAccessibility = this.mapAccessibility(accessibility);
          const csReturnType = methodType === 'Function' ? returnType || 'object' : 'void';
          const csParameters = this.convertParameters(parameters);
          const csBody = this.convertMethodBody(body);

          return `${csAccessibility} ${csReturnType} ${methodName}(${csParameters})\n{\n${csBody}\n}`;
        },
      },

      // Event handlers with actual logic
      {
        id: 'vb-event-handler-complete',
        name: 'Complete Event Handler',
        description: 'Convert VB event handlers with actual implementation',
        category: 'Patterns',
        priority: 10,
        pattern:
          /(Private|Public)\s+Sub\s+(\w+)_(\w+)\s*\(([^)]*)\)\s+Handles\s+([^.\n]+)\.([^.\n]+)\s*\n([\s\S]*?)\nEnd Sub/gm,
        replacement: (match: string, ...groups: string[]) => {
          const [, accessibility, controlName, eventName, parameters, , , body] = groups;
          const csBody = this.convertMethodBody(body);
          const csParameters = this.convertEventParameters(parameters);

          return `private void ${controlName}_${eventName}(${csParameters})\n{\n${csBody}\n}`;
        },
      },

      // For loops with logic
      {
        id: 'vb-for-loop-complete',
        name: 'Complete For Loop',
        description: 'Convert VB For loops with body',
        category: 'Patterns',
        priority: 9,
        pattern:
          /For\s+(\w+)\s+As\s+(\w+)\s+=\s+(.+?)\s+To\s+(.+?)(?:\s+Step\s+(.+?))?\s*\n([\s\S]*?)\nNext/gm,
        replacement: (match: string, ...groups: string[]) => {
          const [, variable, type, start, end, step, body] = groups;
          const csType = this.mapDataType(type);
          const csStep = step ? ` += ${step}` : '++';
          const csBody = this.convertMethodBody(body);

          return `for (${csType} ${variable} = ${start}; ${variable} <= ${end}; ${variable}${csStep})\n{\n${csBody}\n}`;
        },
      },

      // Try-Catch blocks
      {
        id: 'vb-try-catch',
        name: 'Try-Catch Block',
        description: 'Convert VB Try-Catch blocks',
        category: 'Patterns',
        priority: 9,
        pattern: /Try\s*\n([\s\S]*?)\nCatch\s+(\w+)\s+As\s+(\w+)\s*\n([\s\S]*?)\nEnd Try/gm,
        replacement: (match: string, ...groups: string[]) => {
          const [, tryBody, exceptionVar, exceptionType, catchBody] = groups;
          const csTryBody = this.convertMethodBody(tryBody);
          const csCatchBody = this.convertMethodBody(catchBody);

          return `try\n{\n${csTryBody}\n}\ncatch (${exceptionType} ${exceptionVar})\n{\n${csCatchBody}\n}`;
        },
      },

      // Property declarations with getter/setter logic
      {
        id: 'vb-property-complete',
        name: 'Complete Property',
        description: 'Convert VB properties with getter/setter logic',
        category: 'Patterns',
        priority: 9,
        pattern:
          /(Private|Public|Protected)\s+Property\s+(\w+)\s*\(\)\s+As\s+(\w+)\s*\n\s*Get\s*\n([\s\S]*?)\n\s*End Get\s*\n\s*Set\s*\(([^)]+)\)\s*\n([\s\S]*?)\n\s*End Set\s*\nEnd Property/gm,
        replacement: (match: string, ...groups: string[]) => {
          const [, accessibility, propName, propType, getterBody, setterParam, setterBody] = groups;
          const csAccessibility = this.mapAccessibility(accessibility);
          const csType = this.mapDataType(propType);
          const csGetterBody = this.convertMethodBody(getterBody);
          const csSetterBody = this.convertMethodBody(setterBody);

          return `${csAccessibility} ${csType} ${propName}\n{\n    get\n    {\n${csGetterBody}\n    }\n    set\n    {\n${csSetterBody}\n    }\n}`;
        },
      },

      // Database operations
      {
        id: 'vb-sql-command',
        name: 'SQL Command Execution',
        description: 'Convert VB SQL command patterns to C#',
        category: 'Framework',
        priority: 8,
        pattern: /Dim\s+(\w+)\s+As\s+New\s+SqlCommand\s*\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g,
        replacement: 'using var $1 = new SqlCommand("$2", $3)',
      },
    ];

    console.log(`Initialized ${this.rules.length} migration rules`);
  }

  getRules(): MigrationRule[] {
    return [...this.rules];
  }

  getRulesByCategory(category: string): MigrationRule[] {
    return this.rules.filter(rule => rule.category === category);
  }

  getRuleById(id: string): MigrationRule | undefined {
    return this.rules.find(rule => rule.id === id);
  }

  addCustomRule(rule: MigrationRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  // Métodos auxiliares para conversión avanzada
  private convertMethodBody(vbBody: string): string {
    if (!vbBody || vbBody.trim() === '') {
      return '    // TODO: Implement method logic';
    }

    let csBody = vbBody;

    // Aplicar todas las reglas al cuerpo del método
    const context: MigrationContext = {
      filePath: '',
      fileContent: vbBody,
      projectType: 'WinForms',
      targetFramework: 'net8.0',
      usings: new Set(),
      variables: new Map(),
      functions: new Map(),
    };

    csBody = this.applyRules(csBody, context);

    // Indentación apropiada
    const lines = csBody.split('\n');
    const indentedLines = lines.map(line => (line.trim() ? `    ${line}` : line));

    return indentedLines.join('\n');
  }

  private convertParameters(vbParams: string): string {
    if (!vbParams || vbParams.trim() === '') return '';

    const params = vbParams.split(',').map(param => {
      const trimmed = param.trim();
      const match = trimmed.match(/(\w+)\s+As\s+(\w+)/);
      if (match) {
        const [, name, type] = match;
        return `${this.mapDataType(type)} ${name}`;
      }
      return trimmed;
    });

    return params.join(', ');
  }

  private convertEventParameters(vbParams: string): string {
    // Parámetros estándar de eventos en C#
    return 'object sender, EventArgs e';
  }

  private mapAccessibility(vbAccessibility: string): string {
    const map: { [key: string]: string } = {
      Private: 'private',
      Public: 'public',
      Protected: 'protected',
      Friend: 'internal',
    };
    return map[vbAccessibility] || 'private';
  }

  private mapDataType(vbType: string): string {
    const map: { [key: string]: string } = {
      Integer: 'int',
      String: 'string',
      Boolean: 'bool',
      Double: 'double',
      Single: 'float',
      Long: 'long',
      Decimal: 'decimal',
      Date: 'DateTime',
      Object: 'object',
    };
    return map[vbType] || vbType;
  }
}

export interface MigrationReport {
  originalLinesCount: number;
  migratedLinesCount: number;
  appliedRulesCount: number;
  appliedRules: MigrationRule[];
  migrationComplexity: 'Low' | 'Medium' | 'High';
  estimatedEffort: { hours: number; description: string };
}
