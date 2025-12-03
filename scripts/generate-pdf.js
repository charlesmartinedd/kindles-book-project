/**
 * Know Your Homebook PDF Generator
 * Generates print-ready PDF from HTML pages using Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Page order for the workbook
const pageOrder = [
    // Tab 1: Welcome
    'pages/01-cover.html',
    'pages/02-home-snapshot.html',
    // Tab 2: Exterior
    'samples/roof-details.html',  // Page 3
    'pages/04-siding-exterior.html',
    'pages/05-driveway-walkways.html',
    'pages/06-gutters-drainage.html',
    // Tab 3: Major Systems
    'pages/07-water-heater.html',
    'pages/08-furnace-heating.html',
    'pages/09-air-conditioning.html',
    'pages/10-electrical-system.html',
    'pages/11-gfci-outlets.html',
    'pages/12-plumbing-system.html',
    'pages/13-basement-sump.html',
    'pages/14-fireplaces-chimneys.html',
    'pages/15-septic-sewer.html',
    // Tab 4: Interior
    'pages/16-flooring-map.html',
    'pages/17-paint-colors.html',
    // Tab 5: Safety
    'pages/18-smoke-co-detectors.html',
    'pages/19-shutoffs-utilities.html',
    'pages/20-emergency-contacts.html',
    'pages/21-emergency-protocols.html',
    // Tab 6: Maintenance
    'pages/22-why-maintenance-matters.html',
    'samples/maintenance.html',  // Page 23
    'pages/24-maintenance-log.html',
    // Tab 7: Trades
    'pages/25-core-trades.html',
    'pages/26-preferred-providers.html',
    'pages/27-insurance-info.html',
    // Tab 8: What To Do If
    'samples/water-spot.html',  // Page 28
    'pages/29-power-goes-out.html',
    'pages/30-hvac-stops-working.html',
    'pages/31-water-heater-leaks.html',
    'pages/32-toilet-overflows.html',
    'pages/33-pipe-bursts.html',
    'pages/34-garage-door-wont-open.html',
    'pages/35-smoke-detector-beeping.html',
    'pages/36-smell-gas.html',
    'pages/37-foundation-crack.html',
    // Tab 9: Records
    'pages/38-purchase-records.html',
    'pages/39-appliance-records.html',
    'pages/40-warranty-tracker.html',
];

async function generatePDF() {
    const projectRoot = path.resolve(__dirname, '..');
    const outputPath = path.join(projectRoot, 'output', 'Know-Your-Homebook.pdf');

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🏠 Know Your Homebook PDF Generator');
    console.log('====================================');
    console.log(`Generating ${pageOrder.length} pages...`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to US Letter size at 96 DPI
    await page.setViewport({
        width: 816,  // 8.5" * 96 DPI
        height: 1056, // 11" * 96 DPI
        deviceScaleFactor: 2  // High resolution
    });

    // Generate individual page PDFs
    const pagePDFs = [];

    for (let i = 0; i < pageOrder.length; i++) {
        const pagePath = pageOrder[i];
        const fullPath = path.join(projectRoot, pagePath);
        const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;

        console.log(`📄 [${i + 1}/${pageOrder.length}] ${path.basename(pagePath)}`);

        try {
            await page.goto(fileUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for fonts to load
            await page.evaluateHandle('document.fonts.ready');

            // Generate PDF for this page
            const pdfBuffer = await page.pdf({
                format: 'Letter',
                printBackground: true,
                margin: { top: '0', bottom: '0', left: '0', right: '0' },
                preferCSSPageSize: true
            });

            pagePDFs.push(pdfBuffer);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    await browser.close();

    // Merge PDFs using pdf-lib if multiple pages
    if (pagePDFs.length > 0) {
        const { PDFDocument } = require('pdf-lib');

        console.log('\n📚 Merging pages into single PDF...');

        const mergedPdf = await PDFDocument.create();

        for (const pdfBuffer of pagePDFs) {
            const pdf = await PDFDocument.load(pdfBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        fs.writeFileSync(outputPath, mergedPdfBytes);

        console.log(`\n✅ PDF Generated Successfully!`);
        console.log(`📁 Output: ${outputPath}`);
        console.log(`📊 Total Pages: ${pagePDFs.length}`);

        // Get file size
        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`💾 File Size: ${fileSizeMB} MB`);
    }
}

// Run the generator
generatePDF().catch(console.error);
