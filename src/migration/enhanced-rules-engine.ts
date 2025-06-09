// Enhanced Rules Engine for better VB to C# business logic migration
export interface EnhancedMigrationRule {
  id: string;
  name: string;
  description: string;
  category:
    | 'Syntax'
    | 'DataTypes'
    | 'Controls'
    | 'Functions'
    | 'Patterns'
    | 'Framework'
    | 'BusinessLogic';
  priority: number;
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  preProcess?: (content: string) => string;
  postProcess?: (content: string) => string;
  examples?: Array<{ before: string; after: string; description: string }>;
}

export class EnhancedMigrationEngine {
  private rules: EnhancedMigrationRule[] = [];

  constructor() {
    this.initializeEnhancedRules();
  }

  migrateVBtoCSharp(vbContent: string, filePath: string = ''): string {
    let result = vbContent;
    let appliedRulesCount = 0;

    console.log('Starting enhanced VB to C# migration...');

    // Phase 1: Pre-processing and structure identification
    result = this.preprocessContent(result);

    // Phase 2: Apply rules in priority order
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const beforeApply = result;

      if (rule.preProcess) {
        result = rule.preProcess(result);
      }

      if (typeof rule.replacement === 'function') {
        result = result.replace(rule.pattern, rule.replacement);
      } else {
        result = result.replace(rule.pattern, rule.replacement);
      }

      if (rule.postProcess) {
        result = rule.postProcess(result);
      }

      if (beforeApply !== result) {
        appliedRulesCount++;
        console.log(`Applied rule: ${rule.name}`);
      }
    }

    // Phase 3: Final cleanup and formatting
    result = this.postProcessContent(result);

    console.log(`Migration completed. Applied ${appliedRulesCount} rules.`);
    return result;
  }

  private preprocessContent(content: string): string {
    let result = content;

    // Remove empty lines and normalize whitespace
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.replace(/^\s+$/gm, '');

    return result;
  }

  private postProcessContent(content: string): string {
    let result = content;

    // Clean up VB remnants
    result = result.replace(/End if/g, '');
    result = result.replace(/End If/g, '');
    result = result.replace(/End Sub/g, '');
    result = result.replace(/End Function/g, '');

    // Clean up lines and ensure proper formatting
    const lines = result.split('\n');
    const cleanLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Add semicolons where needed
        if (line.match(/^\s*(string|int|bool|var)\s+\w+\s*=/) && !line.endsWith(';')) {
          return line + ';';
        }
        if (
          line.match(/^\s*\w+\s*=/) &&
          !line.endsWith(';') &&
          !line.includes('{') &&
          !line.includes('}')
        ) {
          return line + ';';
        }
        if (line.match(/^\s*(return|MessageBox\.Show)/) && !line.endsWith(';')) {
          return line + ';';
        }
        return line;
      });

    return cleanLines.join('\n');
  }

  private initializeEnhancedRules(): void {
    this.rules = [
      // Enhanced method declaration with complete signature handling
      {
        id: 'enhanced-method-declaration',
        name: 'Enhanced Method Declaration',
        description: 'Convert VB method declarations with proper C# syntax',
        category: 'BusinessLogic',
        priority: 100,
        pattern:
          /(Private|Public|Protected|Friend)?\s*(Sub|Function)\s+(\w+)\s*\(([^)]*)\)(\s+As\s+(\w+))?\s*/g,
        replacement: (
          match: string,
          accessibility: string,
          methodType: string,
          methodName: string,
          parameters: string,
          asClause: string,
          returnType: string
        ) => {
          const csAccessibility = this.mapAccessibility(accessibility || 'Private');
          const csReturnType =
            methodType === 'Function' ? this.mapDataType(returnType || 'object') : 'void';
          const csParameters = this.convertParameters(parameters);

          // Handle event handlers specially
          if (
            methodName.includes('_') &&
            (methodName.includes('Click') ||
              methodName.includes('Load') ||
              methodName.includes('Change'))
          ) {
            return `${csAccessibility} ${csReturnType} ${methodName}(object sender, EventArgs e)`;
          }

          return `${csAccessibility} ${csReturnType} ${methodName}(${csParameters})`;
        },
      },

      // Enhanced variable declarations
      {
        id: 'enhanced-dim-declaration',
        name: 'Enhanced Dim Declaration',
        description: 'Convert VB Dim statements with proper initialization',
        category: 'Syntax',
        priority: 95,
        pattern: /Dim\s+(\w+)\s+As\s+(\w+)(\s*=\s*(.+?))?(?=\s*$|\s*\n)/gm,
        replacement: (
          match: string,
          varName: string,
          varType: string,
          initClause: string,
          initValue: string
        ) => {
          const csType = this.mapDataType(varType);
          if (initValue) {
            return `${csType} ${varName} = ${initValue}`;
          } else {
            // Add default initialization for common types
            const defaultValue = this.getDefaultValue(csType);
            return `${csType} ${varName}${defaultValue ? ` = ${defaultValue}` : ''}`;
          }
        },
      },

      // Enhanced If-Then-Else blocks
      {
        id: 'enhanced-if-then-else',
        name: 'Enhanced If-Then-Else',
        description: 'Convert VB If-Then-Else blocks with proper braces',
        category: 'Syntax',
        priority: 90,
        pattern: /If\s+(.+?)\s+Then\s*\n([\s\S]*?)(?=\n\s*(?:ElseIf|Else|End If))/g,
        replacement: 'if ($1)\n{\n$2\n}',
        postProcess: (content: string) => {
          // Handle ElseIf and Else
          content = content.replace(
            /ElseIf\s+(.+?)\s+Then\s*\n([\s\S]*?)(?=\n\s*(?:ElseIf|Else|End If))/g,
            'else if ($1)\n{\n$2\n}'
          );
          content = content.replace(/Else\s*\n([\s\S]*?)(?=\n\s*End If)/g, 'else\n{\n$1\n}');
          content = content.replace(/End If/g, '');
          return content;
        },
      },

      // Enhanced MsgBox conversion
      {
        id: 'enhanced-msgbox',
        name: 'Enhanced MsgBox',
        description: 'Convert VB MsgBox with proper MessageBox.Show syntax',
        category: 'Functions',
        priority: 85,
        pattern: /MsgBox\s+"([^"]+)"\s*,\s*(vb\w+)/g,
        replacement: (match: string, message: string, vbIcon: string) => {
          const icon = this.mapMessageBoxIcon(vbIcon);
          return `MessageBox.Show("${message}", "Mensaje", MessageBoxButtons.OK, MessageBoxIcon.${icon})`;
        },
      },

      // Enhanced string operations
      {
        id: 'enhanced-string-concat',
        name: 'Enhanced String Concatenation',
        description: 'Convert VB string concatenation with proper C# syntax',
        category: 'Syntax',
        priority: 80,
        pattern: /(\w+|\"[^\"]*\")\s+&\s+(\w+|\"[^\"]*\")/g,
        replacement: '$1 + $2',
      },

      // Enhanced logical operators
      {
        id: 'enhanced-logical-operators',
        name: 'Enhanced Logical Operators',
        description: 'Convert VB logical operators to C#',
        category: 'Syntax',
        priority: 80,
        pattern: /\b(And|Or|Not)\b/g,
        replacement: (match: string, operator: string) => {
          const opMap: { [key: string]: string } = {
            And: '&&',
            Or: '||',
            Not: '!',
          };
          return opMap[operator] || operator;
        },
      },

      // Enhanced data type conversions
      {
        id: 'enhanced-data-types',
        name: 'Enhanced Data Types',
        description: 'Convert VB data types to C# with proper mapping',
        category: 'DataTypes',
        priority: 75,
        pattern: /\b(String|Integer|Boolean|Double|Single|Long|Date|Object)\b/g,
        replacement: (match: string, vbType: string) => {
          return this.mapDataType(vbType);
        },
      },

      // Database operations enhancement
      {
        id: 'enhanced-database-ops',
        name: 'Enhanced Database Operations',
        description: 'Convert VB database operations to modern C# with proper disposal',
        category: 'Framework',
        priority: 70,
        pattern: /Set\s+(\w+)\s+=\s+OpenDatabase\s*\(\s*"([^"]+)"\s*\)/g,
        replacement:
          'using var $1 = new OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$2")',
      },

      // Exit Sub/Function conversion
      {
        id: 'enhanced-exit-statements',
        name: 'Enhanced Exit Statements',
        description: 'Convert VB Exit Sub/Function to C# return',
        category: 'Syntax',
        priority: 65,
        pattern: /Exit\s+(Sub|Function)/g,
        replacement: 'return',
      },

      // Form operations
      {
        id: 'enhanced-form-operations',
        name: 'Enhanced Form Operations',
        description: 'Convert VB form operations to C#',
        category: 'Controls',
        priority: 60,
        pattern: /(Form\d+)\.Show/g,
        replacement: (match: string, formName: string) => {
          return `var ${formName.toLowerCase()} = new ${formName}(); ${formName.toLowerCase()}.Show()`;
        },
      },

      // Me reference conversion
      {
        id: 'enhanced-me-reference',
        name: 'Enhanced Me Reference',
        description: 'Convert VB Me to C# this',
        category: 'Syntax',
        priority: 55,
        pattern: /\bMe\./g,
        replacement: 'this.',
      },

      // Comment conversion
      {
        id: 'enhanced-comments',
        name: 'Enhanced Comments',
        description: 'Convert VB comments to C#',
        category: 'Syntax',
        priority: 20,
        pattern: /^(\s*)'/gm,
        replacement: '$1//',
      },
    ];

    console.log(`Initialized ${this.rules.length} enhanced migration rules`);
  }

  // Helper methods
  private mapAccessibility(vbAccess: string): string {
    const map: { [key: string]: string } = {
      Private: 'private',
      Public: 'public',
      Protected: 'protected',
      Friend: 'internal',
    };
    return map[vbAccess] || 'private';
  }

  private mapDataType(vbType: string): string {
    const map: { [key: string]: string } = {
      String: 'string',
      Integer: 'int',
      Boolean: 'bool',
      Double: 'double',
      Single: 'float',
      Long: 'long',
      Date: 'DateTime',
      Object: 'object',
    };
    return map[vbType] || vbType;
  }

  private convertParameters(vbParams: string): string {
    if (!vbParams || vbParams.trim() === '') return '';

    return vbParams
      .split(',')
      .map(param => {
        const trimmed = param.trim();
        const match = trimmed.match(/(\w+)\s+As\s+(\w+)/);
        if (match) {
          const [, name, type] = match;
          return `${this.mapDataType(type)} ${name}`;
        }
        return trimmed;
      })
      .join(', ');
  }

  private getDefaultValue(csType: string): string | null {
    const defaults: { [key: string]: string } = {
      string: '""',
      int: '0',
      bool: 'false',
      double: '0.0',
      float: '0.0f',
    };
    return defaults[csType] || null;
  }

  private mapMessageBoxIcon(vbIcon: string): string {
    const map: { [key: string]: string } = {
      vbInformation: 'Information',
      vbExclamation: 'Warning',
      vbCritical: 'Error',
      vbQuestion: 'Question',
    };
    return map[vbIcon] || 'Information';
  }

  // Public methods for testing and usage
  getRules(): EnhancedMigrationRule[] {
    return [...this.rules];
  }

  testRule(
    ruleId: string,
    testContent: string
  ): { before: string; after: string; applied: boolean } {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      return { before: testContent, after: testContent, applied: false };
    }

    let result = testContent;
    if (typeof rule.replacement === 'function') {
      result = result.replace(rule.pattern, rule.replacement);
    } else {
      result = result.replace(rule.pattern, rule.replacement);
    }

    return {
      before: testContent,
      after: result,
      applied: result !== testContent,
    };
  }
}

// Export for use in the main MCP system
export const enhancedMigrationEngine = new EnhancedMigrationEngine();
