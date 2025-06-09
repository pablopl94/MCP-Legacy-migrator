// Jest setup file for additional configurations and global mocks

// Extend Jest matchers if needed
expect.extend({
  toBeValidVBProject(received) {
    const pass = received && 
                 typeof received.name === 'string' && 
                 typeof received.projectType === 'string' &&
                 Array.isArray(received.forms) &&
                 Array.isArray(received.modules) &&
                 Array.isArray(received.classes);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid VB project`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid VB project`,
        pass: false,
      };
    }
  },

  toBeValidCSharpProject(received) {
    const pass = received && 
                 typeof received.name === 'string' && 
                 typeof received.targetFramework === 'string' &&
                 Array.isArray(received.files) &&
                 received.files.length > 0;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid C# project`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid C# project`,
        pass: false,
      };
    }
  }
});

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(30000);

// Global variables for tests
global.testFixtures = {
  sampleVBProject: {
    name: 'SampleProject',
    targetFramework: 'net48',
    projectType: 'WinForms',
    forms: [
      {
        name: 'MainForm',
        path: 'MainForm.vb',
        controls: [
          {
            name: 'btnOK',
            type: 'Button',
            properties: { Text: 'OK' },
            events: []
          }
        ],
        events: [],
        properties: []
      }
    ],
    modules: [
      {
        name: 'Utilities',
        path: 'Utilities.bas',
        functions: [
          {
            name: 'GetCurrentTime',
            returnType: 'String',
            parameters: [],
            isPublic: true,
            isStatic: true,
            body: 'Return Now.ToString()'
          }
        ],
        variables: [],
        imports: ['System']
      }
    ],
    classes: [
      {
        name: 'Person',
        path: 'Person.cls',
        inherits: undefined,
        implements: [],
        properties: [
          {
            name: 'Name',
            type: 'String',
            isPublic: true
          }
        ],
        methods: [],
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
  },

  sampleVBCode: {
    simpleForm: `Public Class Form1
    Inherits System.Windows.Forms.Form

    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        MsgBox("Hello World")
    End Sub
End Class`,

    complexModule: `Module ComplexModule
    Public Const MAX_ITEMS As Integer = 100
    Private items(MAX_ITEMS) As String
    
    Public Function ProcessItems() As Boolean
        For i As Integer = 0 To UBound(items)
            If Not String.IsNullOrEmpty(items(i)) Then
                If items(i).Length > 10 Then
                    If items(i).Contains("@") Then
                        ' Process email
                        ProcessEmail(items(i))
                    Else
                        ' Process regular item
                        ProcessRegularItem(items(i))
                    End If
                End If
            End If
        Next
        Return True
    End Function
    
    Private Sub ProcessEmail(email As String)
        ' Email processing logic
    End Sub
    
    Private Sub ProcessRegularItem(item As String)
        ' Regular item processing logic
    End Sub
End Module`,

    dataAccessClass: `Public Class DataAccess
    Private connectionString As String
    
    Public Sub New(connStr As String)
        connectionString = connStr
    End Sub
    
    Public Function GetCustomers() As DataTable
        Dim dt As New DataTable()
        Using conn As New SqlConnection(connectionString)
            conn.Open()
            Dim cmd As New SqlCommand("SELECT * FROM Customers", conn)
            Dim adapter As New SqlDataAdapter(cmd)
            adapter.Fill(dt)
        End Using
        Return dt
    End Function
End Class`
  },

  expectedCSharpCode: {
    simpleForm: `public partial class Form1 : Form
{
    public Form1()
    {
        InitializeComponent();
    }

    private void Button1_Click(object sender, EventArgs e)
    {
        MessageBox.Show("Hello World");
    }
}`,

    serviceClass: `public interface IComplexModuleService
{
    bool ProcessItems();
}

public class ComplexModuleService : IComplexModuleService
{
    private readonly ILogger<ComplexModuleService> _logger;
    private const int MAX_ITEMS = 100;
    private string[] items = new string[MAX_ITEMS];

    public ComplexModuleService(ILogger<ComplexModuleService> logger)
    {
        _logger = logger;
    }

    public bool ProcessItems()
    {
        for (int i = 0; i < items.Length; i++)
        {
            if (!string.IsNullOrEmpty(items[i]))
            {
                if (items[i].Length > 10)
                {
                    if (items[i].Contains("@"))
                    {
                        ProcessEmail(items[i]);
                    }
                    else
                    {
                        ProcessRegularItem(items[i]);
                    }
                }
            }
        }
        return true;
    }

    private void ProcessEmail(string email)
    {
        // Email processing logic
    }

    private void ProcessRegularItem(string item)
    {
        // Regular item processing logic
    }
}`
  }
};

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidVBProject(): R;
      toBeValidCSharpProject(): R;
    }
  }
  
  var testFixtures: {
    sampleVBProject: any;
    sampleVBCode: any;
    expectedCSharpCode: any;
  };
}
