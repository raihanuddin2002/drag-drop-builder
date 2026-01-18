import { NextRequest, NextResponse } from 'next/server';
import { chromium, firefox, webkit, Browser } from 'playwright';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExportPdfBody = {
   html: string;
   title: string;
   engine?: 'chromium' | 'firefox' | 'webkit';
};

async function getBrowser(engine: 'chromium' | 'firefox' | 'webkit'): Promise<Browser> {
   switch (engine) {
      case 'firefox':
         return await firefox.launch({ headless: true });
      case 'webkit':
         return await webkit.launch({ headless: true });
      case 'chromium':
      default:
         return await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
         });
   }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
   let browser: Browser | null = null;
   try {
      const body: ExportPdfBody = await req.json();
      browser = await getBrowser(body.engine || 'chromium');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Ensure the content is fully loaded
      await page.setContent(body.html, { waitUntil: 'networkidle' });

      const pdfBuffer = await page.pdf({
         format: 'A4', // Ensure this matches your UI selection
         printBackground: true,
         displayHeaderFooter: true,
         scale: 1,
         // You MUST have margins for headers/footers to show up
         margin: {
            top: '60px',    // Space for header
            bottom: '60px', // Space for footer
            left: '0px',
            right: '0px'
         },
         headerTemplate: `
      <div style="font-size: 10px; width: 100%; margin: 0 40px; color: #999;">
         ${body.title}
      </div>`,
         footerTemplate: `
      <div style="font-size: 10px; width: 100%; margin: 0 40px; color: #999; display: flex; justify-content: space-between;">
         <span>Generated via Builder</span>
         <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
      });

      return new NextResponse(pdfBuffer, {
         headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${body.title.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
         },
      });
   } catch (err: any) {
      return new NextResponse(JSON.stringify({ error: err?.message }), { status: 500 });
   } finally {
      if (browser) await browser.close(); // Always close browser to prevent memory leaks
   }
}
