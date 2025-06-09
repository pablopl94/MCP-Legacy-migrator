# Legacy VB.NET to C# Migration Tool

## Overview

Complete migration tool for legacy VB.NET and VB6 applications to modern C#/.NET, with MCP (Model Context Protocol) integration for Claude AI.

## Installation

1. Clone or download the project to your desired location
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the TypeScript project:
   ```bash
   npm run build
   ```

## Usage

### Command Line Interface

Basic analysis:
```bash
node dist/index.js --path "C:\path\to\your\vb\project" --analyze-only
```

Full migration:
```bash
node dist/index.js --path "C:\path\to\your\vb\project" --migrate --output "C:\output\directory"
```

### MCP Server for Claude AI

Start the MCP server:
```bash
node dist/index.js --mcp-server
```

Or using npm script:
```bash
npm run mcp-server
```

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "legacy-migrator": {
      "command": "node",
      "args": [
        "C:\\path\\to\\your\\project\\dist\\index.js",
        "--mcp-server"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Features

### Analysis Capabilities
- Project structure analysis
- Code complexity metrics
- Technical debt assessment
- Migration readiness evaluation
- Dependencies analysis

### Migration Features
- VB.NET to C# code conversion
- Project structure modernization
- Clean Architecture implementation
- Dependency migration recommendations

### MCP Tools Available to Claude

1. **analyze_vb_project** - Analyze VB project structure and extract metadata
2. **generate_csharp_migration** - Generate complete C# project from VB analysis
3. **apply_migration_rules** - Apply VB to C# conversion rules to code content
4. **estimate_migration_effort** - Estimate effort and complexity for migration

## Project Structure

```
src/
├── index.ts                 # Main CLI entry point
├── mcp-server.ts           # MCP server implementation
├── parsers/
│   └── vb-parser.ts        # VB.NET/VB6 project parser
├── generators/
│   └── csharp-generator.ts # C# code generator
├── migration/
│   └── rules-engine.ts     # Migration rules engine
├── services/
│   └── analyzer.ts         # Code analysis service
└── types/
    └── analyzer.ts         # TypeScript type definitions
```

## Configuration

Configuration options can be found in `config/default.json`:

- Server settings (host, port, timeout)
- Analysis thresholds
- Migration preferences
- Code smell rules
- Reporting options

## Troubleshooting

### Common Issues

1. **JSON Parse Errors**: Ensure all TypeScript files are properly built and no Unicode characters are causing issues

2. **Module Not Found**: Make sure all dependencies are installed:
   ```bash
   npm install
   npm run build
   ```

3. **Permission Errors**: Ensure the process has read/write access to the specified directories

4. **MCP Connection Issues**: Verify the path in Claude Desktop configuration is correct and the server is running

### Debug Mode

Enable verbose logging:
```bash
node dist/index.js --verbose --path "your-project-path"
```

## Development

### Build Commands

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Run in development mode with ts-node
- `npm run dev:server` - Run MCP server in development mode
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint

### Adding New Migration Rules

1. Edit `src/migration/rules-engine.ts`
2. Add new conversion patterns
3. Test with sample VB code
4. Update documentation

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check this README
2. Review the troubleshooting section
3. Check project logs for error details
4. Ensure all dependencies are correctly installed
