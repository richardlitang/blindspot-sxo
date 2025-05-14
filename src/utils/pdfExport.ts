// PDF Export - Generates branded PDF reports client-side
// Uses browser's print functionality with a custom print stylesheet

import { AuditResult } from './supabase'
import { JourneyResult } from './journeyApi'

interface ExportOptions {
  url?: string
  mode?: string
  date?: Date
}

// Generate HTML content for the PDF
function generateSinglePageReportHTML(result: AuditResult, options: ExportOptions = {}): string {
  const { url = '', mode = 'professional', date = new Date() } = options

  const gradeColors: Record<string, string> = {
    'A+': '#22c55e', 'A': '#22c55e', 'A-': '#22c55e',
    'B+': '#84cc16', 'B': '#84cc16', 'B-': '#84cc16',
    'C+': '#eab308', 'C': '#eab308', 'C-': '#eab308',
    'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
    'F': '#ef4444',
  }

  const gradeColor = gradeColors[result.grade] || '#6b7280'
  const modeLabels: Record<string, string> = {
    professional: 'Professional UX Audit',
    conversion: 'Conversion Optimization',
    roast: 'The Roast',
  }

  const issuesHTML = result.roasts.map((issue, i) => `
    <div class="issue">
      <div class="issue-header">
        <span class="issue-number">${i + 1}</span>
        <h3>${issue.title}</h3>
        <span class="severity">${i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low'}</span>
      </div>
      <p class="complaint">${issue.complaint}</p>
      <div class="fix">
        <strong>Fix:</strong> ${issue.fix}
      </div>
      ${issue.code ? `<div class="code"><code>${issue.code}</code></div>` : ''}
    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blindspot Report - ${url}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
        }
        .logo span { color: #3b82f6; }
        .meta {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
        }
        .grade-section {
          text-align: center;
          margin: 40px 0;
        }
        .grade {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: ${gradeColor};
          color: white;
          font-size: 36px;
          font-weight: bold;
        }
        .mode-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 12px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6b7280;
        }
        .summary {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          font-style: italic;
          text-align: center;
          color: #4b5563;
        }
        .issues-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .issue {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .issue-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .issue-number {
          width: 24px;
          height: 24px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .issue-header h3 {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
        }
        .severity {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .severity:nth-of-type(1) { background: #fef2f2; color: #991b1b; }
        .complaint {
          color: #4b5563;
          margin-bottom: 12px;
        }
        .fix {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 12px;
          color: #166534;
          font-size: 14px;
        }
        .code {
          margin-top: 12px;
          background: #1f2937;
          border-radius: 6px;
          padding: 12px;
        }
        .code code {
          color: #4ade80;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          word-break: break-all;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
        @media print {
          body { padding: 20px; }
          .issue { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Blind<span>spot</span></div>
        <div class="meta">
          <div>${url}</div>
          <div>${date.toLocaleDateString()}</div>
        </div>
      </div>

      <div class="grade-section">
        <div class="grade">${result.grade}</div>
        <div class="mode-badge">${modeLabels[mode] || mode}</div>
      </div>

      <div class="summary">"${result.summary}"</div>

      <h2 class="issues-title">Issues Found</h2>
      ${issuesHTML}

      <div class="footer">
        Generated by Blindspot • blindspot.app
      </div>
    </body>
    </html>
  `
}

// Generate HTML for journey report
function generateJourneyReportHTML(result: JourneyResult, stepCount: number, options: ExportOptions = {}): string {
  const { url = '', date = new Date() } = options

  const gradeColors: Record<string, string> = {
    'A+': '#22c55e', 'A': '#22c55e', 'A-': '#22c55e',
    'B+': '#84cc16', 'B': '#84cc16', 'B-': '#84cc16',
    'C+': '#eab308', 'C': '#eab308', 'C-': '#eab308',
    'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
    'F': '#ef4444',
  }

  const gradeColor = gradeColors[result.grade] || '#6b7280'

  const scoresHTML = [
    { label: 'Clarity', score: result.flowScore.clarity },
    { label: 'Consistency', score: result.flowScore.consistency },
    { label: 'Low Friction', score: result.flowScore.friction },
    { label: 'Trust Flow', score: result.flowScore.trustFlow },
  ].map(({ label, score }) => `
    <div class="score-row">
      <span class="score-label">${label}</span>
      <div class="score-bar">
        <div class="score-fill" style="width: ${score * 10}%; background: ${score >= 7 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444'}"></div>
      </div>
      <span class="score-value">${score}/10</span>
    </div>
  `).join('')

  const issuesHTML = result.roasts.map((issue) => `
    <div class="issue">
      <div class="issue-header">
        <span class="step-badge">Step ${issue.step}</span>
        <h3>${issue.title}</h3>
      </div>
      <p class="complaint">${issue.complaint}</p>
      <div class="fix">
        <strong>Fix:</strong> ${issue.fix}
      </div>
    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blindspot Flow Audit - ${url}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
        }
        .logo span { color: #3b82f6; }
        .meta {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
        }
        .grade-section {
          text-align: center;
          margin: 40px 0;
        }
        .grade {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: ${gradeColor};
          color: white;
          font-size: 36px;
          font-weight: bold;
        }
        .mode-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 12px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6b7280;
        }
        .summary {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          font-style: italic;
          text-align: center;
          color: #4b5563;
        }
        .scores-section {
          margin: 30px 0;
        }
        .scores-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .scores-grid {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
        }
        .score-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .score-row:last-child { margin-bottom: 0; }
        .score-label {
          width: 100px;
          font-size: 14px;
          color: #6b7280;
        }
        .score-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          border-radius: 4px;
        }
        .score-value {
          width: 40px;
          text-align: right;
          font-weight: 600;
          font-size: 14px;
        }
        .dropoff {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        .dropoff-title {
          font-weight: 600;
          color: #991b1b;
          margin-bottom: 8px;
        }
        .dropoff-text {
          color: #7f1d1d;
          font-size: 14px;
        }
        .issues-title {
          font-size: 18px;
          font-weight: 600;
          margin: 30px 0 20px;
        }
        .issue {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .issue-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .step-badge {
          padding: 4px 10px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .issue-header h3 {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
        }
        .complaint {
          color: #4b5563;
          margin-bottom: 12px;
        }
        .fix {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 12px;
          color: #166534;
          font-size: 14px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
        @media print {
          body { padding: 20px; }
          .issue { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Blind<span>spot</span></div>
        <div class="meta">
          <div>Flow Audit • ${stepCount} steps</div>
          <div>${date.toLocaleDateString()}</div>
        </div>
      </div>

      <div class="grade-section">
        <div class="grade">${result.grade}</div>
        <div class="mode-badge">User Flow Analysis</div>
      </div>

      <div class="summary">"${result.summary}"</div>

      <div class="scores-section">
        <h3 class="scores-title">Flow Scores</h3>
        <div class="scores-grid">
          ${scoresHTML}
        </div>
      </div>

      <div class="dropoff">
        <div class="dropoff-title">⚠️ Highest Drop-off Risk</div>
        <div class="dropoff-text">${result.dropOffRisk}</div>
      </div>

      <h2 class="issues-title">Friction Points</h2>
      ${issuesHTML}

      <div class="footer">
        Generated by Blindspot • blindspot.app
      </div>
    </body>
    </html>
  `
}

// Export as PDF using print dialog
export function exportToPDF(result: AuditResult, options: ExportOptions = {}): void {
  const html = generateSinglePageReportHTML(result, options)
  openPrintWindow(html)
}

// Export journey as PDF
export function exportJourneyToPDF(result: JourneyResult, stepCount: number, options: ExportOptions = {}): void {
  const html = generateJourneyReportHTML(result, stepCount, options)
  openPrintWindow(html)
}

// Open print window
function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}
