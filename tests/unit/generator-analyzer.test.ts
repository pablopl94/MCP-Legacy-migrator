import { CSharpGenerator } from '../../src/generators/csharp-generator';
import { LegacyCodeAnalyzer } from '../../src/services/analyzer';
import { VBProject, VBForm, VBModule, VBClass } from '../../src/parsers/vb-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('CSharpGenerator', () => {
  let generator: CSharpGenerator;
  let mockVBProject: VBProject;
  let outputPath: string;

  beforeEach(() => {
    outputPath = path.join(__dirname, '..', 'temp', 'csharp-output');
    
    mockVBProject = {
      name: 'TestProject',
      path: '/test/path',
      targetFramework: 'net48',
      projectType: 'WinForms',
      forms: [
        {
          name: 'MainForm',
          path: 'MainForm.vb',
          controls: [
            {
              name: 'btnSave',
              type: 'Button',
              properties: { Text: 'Save' },
              events: []
            },
            {
              name: 'txtName',
              type: 'TextBox',
              properties: { Text: '' },
              events: []
            }
          ],
          events: [
            {
              name: 'Click',
              handler: 'btnSave_Click',
              parameters: [
                { name: 'sender', type: 'Object' },
                { name: 'e', type: 'EventArgs' }
              ]
            }
          ],
          properties: []
        }
      ],
      modules: [
        {
          name: 'UtilityModule',
          path: 'UtilityModule.bas',
          functions: [
            {
              name: 'GetFormattedDate',
              returnType: 'String',
              parameters: [
                { name: 'dateValue', type: 'Date' }
              ],
              isPublic: true,
              isStatic: true,
              body: 'Return dateValue.ToString("yyyy-MM-dd")'
            }
          ],
          variables: [
            {
              name: 'APP_NAME',
              type: 'String',
              scope: 'Public',
              isStatic: true,
              defaultValue: '"Test Application"'
            }
          ],
          imports: ['System', 'System.IO']
        }
      ],
      classes: [
        {
          name: 'Customer',
          path: 'Customer.cls',
          inherits: undefined,
          implements: [],
          properties: [
            {
              name: 'Name',
              type: 'String',
              isPublic: true
            },
            {
              name: 'Age',
              type: 'Integer',
              isPublic: true
            }
          ],
          methods: [
            {
              name: 'GetFullInfo',
              returnType: 'String',
              parameters: [],
              isPublic: true,
              isStatic: false,
              body: 'Return Name & " - " & Age.ToString()'
            }
          ],
          events: []
        }
      ],
      references: [
        {
          name: 'System.Windows.Forms',
          type: 'Assembly',
          version: '4.0.0.0'
        }
      ]
    };

    generator = new CSharpGenerator(mockVBProject, outputPath);
  });

  describe('generateProject', () => {
    it('should generate complete C# project structure', async () => {
      const csharpProject = await generator.generateProject();
      
      expect(csharpProject.name).toBe('TestProject');
      expect(csharpProject.targetFramework).toBe('net8.0-windows');
      expect(csharpProject.files.length).toBeGreaterThan(0);
      
      // Check for solution file
      const solutionFile = csharpProject.files.find(f => f.path.endsWith('.sln'));
      expect(solutionFile).toBeDefined();
      
      // Check for project files
      const coreProject = csharpProject.files.find(f => f.path.includes('.Core.csproj'));
      const winFormsProject = csharpProject.files.find(f => f.path.includes('.WinForms.csproj'));
      const dataProject = csharpProject.files.find(f => f.path.includes('.Data.csproj'));
      
      expect(coreProject).toBeDefined();
      expect(winFormsProject).toBeDefined();
      expect(dataProject).toBeDefined();
    });

    it('should generate models from VB classes', async () => {
      const csharpProject = await generator.generateProject();
      
      const customerModel = csharpProject.files.find(f => 
        f.path.includes('Models/Customer.cs')
      );
      
      expect(customerModel).toBeDefined();
      expect(customerModel!.content).toContain('public class Customer');
      expect(customerModel!.content).toContain('public string Name');
      expect(customerModel!.content).toContain('public int Age');
    });

    it('should generate forms from VB forms', async () => {
      const csharpProject = await generator.generateProject();
      
      const mainForm = csharpProject.files.find(f => 
        f.path.includes('Forms/MainForm.cs')
      );
      
      expect(mainForm).toBeDefined();
      expect(mainForm!.content).toContain('public partial class MainForm : Form');
      expect(mainForm!.content).toContain('btnSave_Click');
    });

    it('should generate services from VB modules', async () => {
      const csharpProject = await generator.generateProject();
      
      const utilityService = csharpProject.files.find(f => 
        f.path.includes('Services/UtilityModuleService.cs')
      );
      
      expect(utilityService).toBeDefined();
      expect(utilityService!.content).toContain('public class UtilityModuleService');
      expect(utilityService!.content).toContain('GetFormattedDate');
    });
  });

  describe('writeProjectToDisk', () => {
    it('should write all files to disk', async () => {
      const csharpProject = await generator.generateProject();
      await generator.writeProjectToDisk(csharpProject);
      
      // Check if solution file was created
      const solutionPath = path.join(outputPath, `${mockVBProject.name}.sln`);
      expect(await fs.pathExists(solutionPath)).toBe(true);
      
      // Check if at least one project file was created
      const coreProjectPath = path.join(outputPath, `src/${mockVBProject.name}.Core/${mockVBProject.name}.Core.csproj`);
      expect(await fs.pathExists(coreProjectPath)).toBe(true);
    });
  });

  afterEach(async () => {
    // Clean up generated files
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }
  });
});

describe('LegacyCodeAnalyzer', () => {
  let analyzer: LegacyCodeAnalyzer;
  let testProjectPath: string;

  beforeEach(() => {
    testProjectPath = path.join(__dirname, '..', 'fixtures', 'analyzer-test');
    analyzer = new LegacyCodeAnalyzer(testProjectPath);
  });

  describe('analyze', () => {
    it('should analyze project structure correctly', async () => {
      // Create test project structure
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

    Private Sub Button1_Click(sender As Object, e As EventArgs)
        ' This is a very long method that does many things
        ' and should be flagged as a code smell
        Dim x As Integer = 1
        If x = 1 Then
            If x = 1 Then
                If x = 1 Then
                    If x = 1 Then
                        MsgBox("Deep nesting example")
                    End If
                End If
            End If
        End If
        
        ' Magic number example
        Dim result As Integer = x * 12345
        
        For i As Integer = 1 To 100
            ' Long loop doing repetitive work
            Console.WriteLine(i.ToString())
        Next
    End Sub
End Class`;
      
      await fs.writeFile(path.join(testProjectPath, 'Form1.vb'), vbFormContent);

      const analysis = await analyzer.analyze();
      
      expect(analysis.projectInfo.name).toBe('TestProject');
      expect(analysis.files.length).toBeGreaterThan(0);
      expect(analysis.complexity.linesOfCode).toBeGreaterThan(0);
      expect(analysis.codeSmells.length).toBeGreaterThan(0);
      
      // Check for specific code smells
      const deepNestingSmell = analysis.codeSmells.find(smell => 
        smell.type === 'Deep Nesting'
      );
      expect(deepNestingSmell).toBeDefined();
      
      const magicNumberSmell = analysis.codeSmells.find(smell => 
        smell.type === 'Magic Number'
      );
      expect(magicNumberSmell).toBeDefined();
    });

    it('should calculate complexity metrics correctly', async () => {
      await fs.ensureDir(testProjectPath);
      
      const simpleVBCode = `Public Class SimpleClass
    Public Function SimpleMethod() As String
        Return "Hello World"
    End Function
End Class`;
      
      await fs.writeFile(path.join(testProjectPath, 'SimpleClass.vb'), simpleVBCode);
      await fs.writeFile(path.join(testProjectPath, 'TestProject.vbproj'), '<Project />');

      const analysis = await analyzer.analyze();
      
      expect(analysis.complexity.numberOfClasses).toBeGreaterThanOrEqual(1);
      expect(analysis.complexity.numberOfFunctions).toBeGreaterThanOrEqual(1);
      expect(analysis.complexity.maintainabilityIndex).toBeGreaterThan(0);
    });
  });

  describe('generateModernizationProposal', () => {
    it('should generate comprehensive modernization proposal', async () => {
      // Create minimal test project
      await fs.ensureDir(testProjectPath);
      await fs.writeFile(path.join(testProjectPath, 'TestProject.vbproj'), '<Project />');
      await fs.writeFile(path.join(testProjectPath, 'Form1.vb'), 'Public Class Form1\nEnd Class');

      const analysis = await analyzer.analyze();
      const proposal = await analyzer.generateModernizationProposal(analysis);
      
      expect(proposal.recommendations.length).toBeGreaterThan(0);
      expect(proposal.risks.length).toBeGreaterThanOrEqual(0);
      expect(proposal.estimate).toBeDefined();
      expect(proposal.timeline).toBeDefined();
      expect(proposal.prerequisites.length).toBeGreaterThan(0);
      
      // Check for architecture recommendation
      const archRec = proposal.recommendations.find(rec => 
        rec.type === 'Architecture'
      );
      expect(archRec).toBeDefined();
      
      // Check for testing recommendation
      const testRec = proposal.recommendations.find(rec => 
        rec.type === 'Testing'
      );
      expect(testRec).toBeDefined();
    });

    it('should estimate effort realistically', async () => {
      await fs.ensureDir(testProjectPath);
      await fs.writeFile(path.join(testProjectPath, 'TestProject.vbproj'), '<Project />');
      
      // Create multiple files to increase effort
      for (let i = 1; i <= 5; i++) {
        await fs.writeFile(
          path.join(testProjectPath, `Form${i}.vb`), 
          `Public Class Form${i}\n    Private Sub Button_Click()\n    End Sub\nEnd Class`
        );
      }

      const analysis = await analyzer.analyze();
      const proposal = await analyzer.generateModernizationProposal(analysis);
      
      expect(proposal.estimate.totalHours).toBeGreaterThan(0);
      expect(proposal.estimate.developmentHours).toBeGreaterThan(0);
      expect(proposal.timeline.totalWeeks).toBeGreaterThan(0);
      expect(proposal.estimate.confidence).toMatch(/Low|Medium|High/);
    });
  });

  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testProjectPath)) {
      await fs.remove(testProjectPath);
    }
  });
});
