import { describe, it } from 'vitest';
import { runBasicVsAdvancedBenchmark } from '../benchmark/benchmark-runner.js';
import { buildBenchmarkReport } from '../benchmark/benchmark-report-builder.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Generate Report', () => {
  it('runs benchmark and outputs report file', () => {
    console.log('Running Basic vs Advanced AI benchmark (50 rounds)...');
    const result = runBasicVsAdvancedBenchmark(50);
    console.log('Generating report...');
    const report = buildBenchmarkReport(result);

    const destDir = path.resolve('docs');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'changsha-mahjong-ai-v071-benchmark-report.md');
    fs.writeFileSync(destPath, report, 'utf8');
    console.log(`Report successfully written to ${destPath}`);
  });
});
