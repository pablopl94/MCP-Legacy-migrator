#!/usr/bin/env node

import { Command } from 'commander';
import { LegacyCodeAnalyzer } from './services/analyzer';
import { LegacyMCPServer } from './mcp-server';
import { VBParser } from './parsers/vb-parser';
import { CSharpGenerator } from './generators/csharp-generator';
import { MigrationRulesEngine } from './migration/rules-engine';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';

const program = new Command();

program
  .version('2.0.0')
  .description('Complete VB.NET to C# Migration Tool with MCP Integration')
  .option('-p, --path <path>', 'Path to the legacy project', process.cwd())
  .option('-o, --output <path>', 'Output path for the analysis report or migrated project', './output')
  .option('-f, --format <format>', 'Output format (json|html|markdown)', 'json')
  .option('--migrate', 'Perform full migration to C#')
  .option('--analyze-only', 'Only analyze the project without migration')
  .option('--mcp-server', 'Start MCP server for Claude integration')
  .option('--target-framework <framework>', 'Target .NET framework', 'net8.0')
  .option('--architecture <arch>', 'Target architecture (Clean|Layered|MVC|Simple)', 'Clean')
  .option('--verbose', 'Enable verbose logging')
  .option('--include-tests', 'Generate unit tests for migrated code')
  .option('--dry-run', 'Perform analysis without writing files')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    // Configure logging
    if (options.verbose) {
      console.log(chalk.blue('[CONFIG] Verbose logging enabled'));
    }

    // Start MCP Server if requested
    if (options.mcpServer) {
      console.log(chalk.blue('[MCP] Starting MCP Server for Claude integration...'));
      const mcpServer = new LegacyMCPServer();
      await mcpServer.start();
      return;
    }

    // Validate project path
    if (!await fs.pathExists(options.path)) {
      throw new Error(`Project path does not exist: ${options.path}`);
    }

    console.log(chalk.blue('[INIT] Starting Legacy Code Analysis and Migration Tool...'));
    console.log(chalk.gray(`Project Path: ${path.resolve(options.path)}`));
    console.log(chalk.gray(`Output Path: ${path.resolve(options.output)}`));
    
    // Initialize analyzer
    const analyzer = new LegacyCodeAnalyzer(path.resolve(options.path));
    
    // Perform analysis
    console.log(chalk.yellow('[ANALYSIS] Analyzing project structure and code quality...'));
    const analysis = await analyzer.analyze();
    
    console.log(chalk.yellow('[PROPOSAL] Generating modernization proposal...'));
    const proposal = await analyzer.generateModernizationProposal(analysis);
    
    // Create comprehensive report
    const report = {
      metadata: {
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        projectPath: options.path,
        outputPath: options.output,
        options: options
      },
      analysis,
      proposal,
      summary: generateSummary(analysis, proposal)
    };

    // Save analysis report
    if (!options.dryRun) {
      await fs.ensureDir(options.output);
      const reportPath = path.join(options.output, `analysis-report.${options.format}`);
      
      let reportContent: string;
      switch (options.format.toLowerCase()) {
        case 'html':
          reportContent = generateHTMLReport(report);
          break;
        case 'markdown':
          reportContent = generateMarkdownReport(report);
          break;
        default:
          reportContent = JSON.stringify(report, null, 2);
      }
      
      await fs.writeFile(reportPath, reportContent);
      console.log(chalk.green(`[REPORT] Analysis report saved to: ${reportPath}`));
    }

    // Perform migration if requested
    if (options.migrate && !options.analyzeOnly) {
      console.log(chalk.blue('[MIGRATION] Starting migration process...'));
      
      const migrationResult = await analyzer.performMigration(options.output, {
        targetFramework: options.targetFramework,
        architecture: options.architecture,
        includeTests: options.includeTests
      });

      if (migrationResult.success) {
        console.log(chalk.green('[SUCCESS] Migration completed successfully!'));
        console.log(chalk.green(`[OUTPUT] Migrated project saved to: ${options.output}`));
        console.log(chalk.green(`[STATS] Generated ${migrationResult.generatedFiles} files`));
        
        if (migrationResult.warnings.length > 0) {
          console.log(chalk.yellow('[WARNING] Warnings:'));
          migrationResult.warnings.forEach((warning: string) => 
            console.log(chalk.yellow(`   • ${warning}`))
          );
        }
      } else {
        console.log(chalk.red('[ERROR] Migration failed:'));
        migrationResult.errors.forEach((error: string) => 
          console.log(chalk.red(`   • ${error}`))
        );
        process.exit(1);
      }
    }

    // Display summary
    displaySummary(analysis, proposal);
    
    if (!options.migrate && !options.analyzeOnly) {
      console.log(chalk.blue('\n[NEXT STEPS] Recommended actions:'));
      console.log(chalk.white('  1. Review the analysis report'));
      console.log(chalk.white('  2. Address high-priority recommendations'));
      console.log(chalk.white('  3. Run with --migrate flag to perform migration'));
      console.log(chalk.white('  4. Use --mcp-server to integrate with Claude AI'));
    }
    
  } catch (error) {
    console.error(chalk.red('[ERROR] Error during execution:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

function generateSummary(analysis: any, proposal: any) {
  return {
    projectInfo: {
      name: analysis.projectInfo.name,
      type: analysis.projectInfo.type,
      framework: analysis.projectInfo.framework,
      totalFiles: analysis.files.length
    },
    complexity: {
      totalLinesOfCode: analysis.complexity.linesOfCode,
      maintainabilityIndex: analysis.complexity.maintainabilityIndex,
      cyclomaticComplexity: analysis.complexity.cyclomaticComplexity,
      codeSmells: analysis.codeSmells.length
    },
    migration: {
      readinessScore: analysis.migrationReadiness.score,
      estimatedHours: proposal.estimate.totalHours,
      estimatedWeeks: proposal.timeline.totalWeeks,
      riskLevel: proposal.risks.length > 0 ? 'High' : 'Medium'
    },
    recommendations: {
      total: proposal.recommendations.length,
      critical: proposal.recommendations.filter((r: any) => r.priority === 'critical').length,
      high: proposal.recommendations.filter((r: any) => r.priority === 'high').length
    }
  };
}

function displaySummary(analysis: any, proposal: any) {
  console.log(chalk.blue('\n[SUMMARY] Project Analysis Summary:'));
  console.log(`${chalk.white('Project:')} ${analysis.projectInfo.name} (${analysis.projectInfo.type})`);
  console.log(`${chalk.white('Files analyzed:')} ${analysis.files.length}`);
  console.log(`${chalk.white('Lines of code:')} ${analysis.complexity.linesOfCode.toLocaleString()}`);
  console.log(`${chalk.white('Code smells found:')} ${analysis.codeSmells.length}`);
  
  // Migration readiness
  const readinessColor = analysis.migrationReadiness.score >= 80 ? chalk.green : 
                        analysis.migrationReadiness.score >= 60 ? chalk.yellow : chalk.red;
  console.log(`${chalk.white('Migration readiness:')} ${readinessColor(analysis.migrationReadiness.score + '%')} (${analysis.migrationReadiness.level})`);
  
  // Effort estimation
  console.log(`${chalk.white('Estimated effort:')} ${proposal.estimate.totalHours} hours (${proposal.timeline.totalWeeks} weeks)`);
  
  // Recommendations
  const criticalRecs = proposal.recommendations.filter((r: any) => r.priority === 'critical').length;
  const highRecs = proposal.recommendations.filter((r: any) => r.priority === 'high').length;
  
  if (criticalRecs > 0) {
    console.log(`${chalk.white('Critical recommendations:')} ${chalk.red(criticalRecs)}`);
  }
  if (highRecs > 0) {
    console.log(`${chalk.white('High priority recommendations:')} ${chalk.yellow(highRecs)}`);
  }
  
  // Risks
  const highRisks = proposal.risks.filter((r: any) => r.severity === 'high').length;
  if (highRisks > 0) {
    console.log(`${chalk.white('High risks identified:')} ${chalk.red(highRisks)}`);
  }
  
  // Technical debt
  if (analysis.technicalDebt.severity === 'High') {
    console.log(`${chalk.white('Technical debt:')} ${chalk.red('High')} (${analysis.technicalDebt.totalDebtHours} hours)`);
  }
}

function generateHTMLReport(report: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Migration Analysis Report - ${report.analysis.projectInfo.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #ecf0f1; padding: 20px; border-radius: 6px; border-left: 4px solid #3498db; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Legacy Migration Analysis Report</h1>
        <p><strong>Project:</strong> ${report.analysis.projectInfo.name}</p>
        <p><strong>Generated:</strong> ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="metric-value">${report.summary.complexity.totalLinesOfCode.toLocaleString()}</div>
                <div class="metric-label">Lines of Code</div>
            </div>
            <div class="summary-card">
                <div class="metric-value">${report.summary.projectInfo.totalFiles}</div>
                <div class="metric-label">Files Analyzed</div>
            </div>
            <div class="summary-card">
                <div class="metric-value">${report.summary.migration.readinessScore}%</div>
                <div class="metric-label">Migration Readiness</div>
            </div>
            <div class="summary-card">
                <div class="metric-value">${report.summary.migration.estimatedWeeks}</div>
                <div class="metric-label">Estimated Weeks</div>
            </div>
        </div>

        <h2>Analysis Summary</h2>
        <p>This VB.NET project has been analyzed for migration readiness to modern C#/.NET. The analysis includes code quality metrics, technical debt assessment, and migration recommendations.</p>
        
        <h2>Next Steps</h2>
        <ol>
            <li>Review the detailed recommendations</li>
            <li>Address high-priority issues</li>
            <li>Plan the migration timeline</li>
            <li>Begin incremental migration</li>
        </ol>
    </div>
</body>
</html>`;
}

function generateMarkdownReport(report: any): string {
  return `# Legacy Migration Analysis Report

**Project:** ${report.analysis.projectInfo.name}  
**Generated:** ${new Date(report.metadata.generatedAt).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Lines of Code | ${report.summary.complexity.totalLinesOfCode.toLocaleString()} |
| Files Analyzed | ${report.summary.projectInfo.totalFiles} |
| Migration Readiness | ${report.summary.migration.readinessScore}% |
| Estimated Effort | ${report.summary.migration.estimatedWeeks} weeks |

## Analysis Results

This project shows **${report.summary.migration.readinessScore}%** migration readiness with **${report.summary.complexity.codeSmells}** code smells identified.

## Recommendations

The analysis generated **${report.summary.recommendations.total}** recommendations, including **${report.summary.recommendations.critical}** critical and **${report.summary.recommendations.high}** high-priority items.

## Next Steps

1. Review detailed analysis
2. Address blocking issues
3. Plan migration phases
4. Begin implementation

---

*Generated by Legacy VB to C# Migration Tool v${report.metadata.version}*
`;
}

// Export for programmatic usage
export {
  LegacyCodeAnalyzer,
  LegacyMCPServer,
  VBParser,
  CSharpGenerator,
  MigrationRulesEngine
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}
