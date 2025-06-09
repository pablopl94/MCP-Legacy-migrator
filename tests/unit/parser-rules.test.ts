import { VBParser } from '../../src/parsers/vb-parser';
import { MigrationRulesEngine } from '../../src/migration/rules-engine';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('VBParser', () => {
  let parser: VBParser;
  let testProjectPath: string;

  beforeEach(() => {
    testProjectPath = path.join(__dirname, '..', 'fixtures', 'sample-vb-project');
    parser = new VBParser(testProjectPath);
  });

  describe('parseVBProject', () => {
    it('should throw error for non-existent project', async () => {
      const invalidParser = new VBParser('/non/existent/path');
      await expect(invalidParser.parseVBProject()).rejects.toThrow();
    });

    it('should parse VB.NET project correctly', async () => {
      // Create a minimal test project structure
      await fs.ensureDir(testProjectPath);
      const vbprojContent = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net48</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
  </PropertyGroup>
</Project>`;
      
      await fs.writeFile(path.join(testProjectPath, 'TestProject.vbproj'), vbprojContent);
      
      const vbFormContent = `Public Class Form1
    Inherits System.Windows.Forms.Form

    Friend WithEvents Button1 As Button
    Friend WithEvents TextBox1 As TextBox

    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        MessageBox.Show("Hello World")
    End Sub
End Class`;
      
      await fs.writeFile(path.join(testProjectPath, 'Form1.vb'), vbFormContent);

      const project = await parser.parseVBProject();
      
      expect(project.name).toBe('TestProject');
      expect(project.projectType).toBe('WinForms');
      expect(project.forms.length).toBeGreaterThan(0);
      expect(project.forms[0].name).toBe('Form1');
      expect(project.forms[0].controls.length).toBe(2);
    });

    it('should parse VB6 project correctly', async () => {
      await fs.ensureDir(testProjectPath);
      
      const vbpContent = `Type=Exe
Form=Form1.frm
Reference=*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#C:\\Windows\\SysWOW64\\stdole2.tlb#OLE Automation
Module=Module1; Module1.bas
Startup="Form1"`;
      
      await fs.writeFile(path.join(testProjectPath, 'TestProject.vbp'), vbpContent);
      
      const project = await parser.parseVBProject();
      
      expect(project.name).toBe('TestProject');
      expect(project.targetFramework).toBe('VB6');
      expect(project.projectType).toBe('WinForms');
    });
  });

  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testProjectPath)) {
      await fs.remove(testProjectPath);
    }
  });
});

describe('MigrationRulesEngine', () => {
  let rulesEngine: MigrationRulesEngine;

  beforeEach(() => {
    rulesEngine = new MigrationRulesEngine();
  });

  describe('applyRules', () => {
    it('should convert VB variable declarations to C#', () => {
      const vbCode = 'Dim nombre As String';
      const context = {
        filePath: 'test.vb',
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set<string>(),
        variables: new Map<string, string>(),
        functions: new Map<string, string>()
      };

      const result = rulesEngine.applyRules(vbCode, context);
      expect(result).toContain('string nombre');
    });

    it('should convert VB If-Then statements to C#', () => {
      const vbCode = 'If x > 5 Then';
      const context = {
        filePath: 'test.vb',
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set<string>(),
        variables: new Map<string, string>(),
        functions: new Map<string, string>()
      };

      const result = rulesEngine.applyRules(vbCode, context);
      expect(result).toContain('if (x > 5)');
    });

    it('should convert VB string concatenation to C#', () => {
      const vbCode = 'resultado = "Hola" & " Mundo"';
      const context = {
        filePath: 'test.vb',
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set<string>(),
        variables: new Map<string, string>(),
        functions: new Map<string, string>()
      };

      const result = rulesEngine.applyRules(vbCode, context);
      expect(result).toContain('resultado = "Hola" + " Mundo"');
    });

    it('should convert VB MsgBox to C# MessageBox.Show', () => {
      const vbCode = 'MsgBox("Hello World")';
      const context = {
        filePath: 'test.vb',
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set<string>(),
        variables: new Map<string, string>(),
        functions: new Map<string, string>()
      };

      const result = rulesEngine.applyRules(vbCode, context);
      expect(result).toContain('MessageBox.Show("Hello World")');
    });

    it('should convert VB For loop to C# for loop', () => {
      const vbCode = 'For i = 1 To 10';
      const context = {
        filePath: 'test.vb',
        fileContent: vbCode,
        projectType: 'WinForms',
        targetFramework: 'net8.0',
        usings: new Set<string>(),
        variables: new Map<string, string>(),
        functions: new Map<string, string>()
      };

      const result = rulesEngine.applyRules(vbCode, context);
      expect(result).toContain('for (int i = 1; i <= 10; i++)');
    });
  });

  describe('getRules', () => {
    it('should return all migration rules', () => {
      const rules = rulesEngine.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].id).toBeDefined();
      expect(rules[0].name).toBeDefined();
      expect(rules[0].pattern).toBeDefined();
    });

    it('should return rules sorted by priority', () => {
      const rules = rulesEngine.getRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i-1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });
  });

  describe('getRulesByCategory', () => {
    it('should filter rules by category', () => {
      const syntaxRules = rulesEngine.getRulesByCategory('Syntax');
      expect(syntaxRules.length).toBeGreaterThan(0);
      syntaxRules.forEach(rule => {
        expect(rule.category).toBe('Syntax');
      });
    });

    it('should return empty array for non-existent category', () => {
      const nonExistentRules = rulesEngine.getRulesByCategory('NonExistent');
      expect(nonExistentRules).toEqual([]);
    });
  });

  describe('addCustomRule', () => {
    it('should add custom rule successfully', () => {
      const customRule = {
        id: 'custom-test',
        name: 'Custom Test Rule',
        description: 'Test custom rule',
        category: 'Syntax' as const,
        priority: 5,
        pattern: /test/g,
        replacement: 'TEST',
        examples: []
      };

      const beforeCount = rulesEngine.getRules().length;
      rulesEngine.addCustomRule(customRule);
      const afterCount = rulesEngine.getRules().length;

      expect(afterCount).toBe(beforeCount + 1);
      expect(rulesEngine.getRuleById('custom-test')).toBeDefined();
    });
  });

  describe('removeRule', () => {
    it('should remove rule successfully', () => {
      const rules = rulesEngine.getRules();
      if (rules.length > 0) {
        const ruleToRemove = rules[0];
        const result = rulesEngine.removeRule(ruleToRemove.id);
        expect(result).toBe(true);
        expect(rulesEngine.getRuleById(ruleToRemove.id)).toBeUndefined();
      }
    });

    it('should return false for non-existent rule', () => {
      const result = rulesEngine.removeRule('non-existent-rule');
      expect(result).toBe(false);
    });
  });
});
