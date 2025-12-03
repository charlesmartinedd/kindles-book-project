/**
 * Know Your Homebook - Design Verification Script
 * Takes screenshots of key pages for visual inspection
 *
 * Usage: node scripts/verify-designs.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Key pages to verify (representative of each page type)
const pagesToVerify = [
    { file: 'pages/01-cover.html', name: '01-cover', desc: 'Cover page - branding check' },
    { file: 'pages/02-home-snapshot.html', name: '02-home-snapshot', desc: 'Form fields layout' },
    { file: 'samples/roof-details.html', name: '03-roof-details', desc: 'Info page format' },
    { file: 'pages/07-water-heater.html', name: '07-water-heater', desc: 'Major systems page' },
    { file: 'pages/18-smoke-co-detectors.html', name: '18-smoke-detectors', desc: 'Safety page' },
    { file: 'samples/maintenance.html', name: '23-maintenance', desc: 'Checklist format' },
    { file: 'samples/water-spot.html', name: '28-water-spot', desc: 'What To Do If format' },
    { file: 'pages/40-warranty-tracker.html', name: '40-warranty-tracker', desc: 'Table format' },
    // Also verify landing page and success page
    { file: 'index.html', name: 'landing-page', desc: 'Main landing page' },
    { file: 'success.html', name: 'success-page', desc: 'Post-purchase download' },
];

// Verification checklist
const checklistItems = [
    'Moose icon visible in footer',
    'Lake Teal (#3A9C8E) on headers',
    '3-hole punch margins present',
    'Text readable at print size',
    'No overflow/clipping issues',
    'MoosePack branding consistent',
];

async function verifyDesigns() {
    const projectRoot = path.resolve(__dirname, '..');
    const outputDir = path.join(projectRoot, 'verification');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('======================================================');
    console.log('  KNOW YOUR HOMEBOOK - Design Verification');
    console.log('======================================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to US Letter size at 96 DPI (same as PDF generation)
    await page.setViewport({
        width: 816,   // 8.5" * 96 DPI
        height: 1056, // 11" * 96 DPI
        deviceScaleFactor: 2  // High resolution
    });

    const results = [];

    for (let i = 0; i < pagesToVerify.length; i++) {
        const { file, name, desc } = pagesToVerify[i];
        const fullPath = path.join(projectRoot, file);
        const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;
        const screenshotPath = path.join(outputDir, `${name}.png`);

        console.log(`[${i + 1}/${pagesToVerify.length}] ${name}`);
        console.log(`    ${desc}`);

        try {
            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                console.log(`    ERROR: File not found`);
                results.push({ name, status: 'error', message: 'File not found' });
                continue;
            }

            await page.goto(fileUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for fonts to load
            await page.evaluateHandle('document.fonts.ready');

            // Take screenshot
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            console.log(`    OK - Screenshot saved`);
            results.push({ name, status: 'ok', screenshot: screenshotPath });

        } catch (error) {
            console.log(`    ERROR: ${error.message}`);
            results.push({ name, status: 'error', message: error.message });
        }
        console.log('');
    }

    await browser.close();

    // Generate verification report
    const reportPath = path.join(outputDir, 'VERIFICATION_REPORT.md');
    const reportContent = generateReport(results, outputDir);
    fs.writeFileSync(reportPath, reportContent);

    console.log('======================================================');
    console.log('  VERIFICATION COMPLETE');
    console.log('======================================================');
    console.log(`\nScreenshots saved to: ${outputDir}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log(`\nTotal pages verified: ${results.filter(r => r.status === 'ok').length}/${pagesToVerify.length}`);
    console.log('\nOpen the verification folder to review screenshots.');
    console.log('\nCHECKLIST:');
    checklistItems.forEach(item => console.log(`  [ ] ${item}`));
}

function generateReport(results, outputDir) {
    const timestamp = new Date().toISOString().split('T')[0];

    let report = `# Know Your Homebook - Design Verification Report

**Date**: ${timestamp}
**Output Directory**: ${outputDir}

## Summary

| Page | Status | Notes |
|------|--------|-------|
`;

    results.forEach(r => {
        const status = r.status === 'ok' ? 'OK' : 'ERROR';
        const notes = r.status === 'ok' ? 'Screenshot captured' : r.message;
        report += `| ${r.name} | ${status} | ${notes} |\n`;
    });

    report += `

## Verification Checklist

Review each screenshot and check:

`;

    checklistItems.forEach(item => {
        report += `- [ ] ${item}\n`;
    });

    report += `

## Screenshots

`;

    results.filter(r => r.status === 'ok').forEach(r => {
        report += `### ${r.name}\n`;
        report += `![${r.name}](./${r.name}.png)\n\n`;
    });

    report += `

## Next Steps

1. Review all screenshots for visual issues
2. Check each item on the verification checklist
3. If issues found, fix and re-run: \`node scripts/verify-designs.js\`
4. Once verified, proceed with Stripe payment link setup
`;

    return report;
}

// Run verification
verifyDesigns().catch(console.error);
