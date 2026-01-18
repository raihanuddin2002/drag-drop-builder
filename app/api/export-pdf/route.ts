import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest): Promise<NextResponse> {
   try {
      const body: {
         html: string;
         title: string;
      } = await req.json();

      const browser = await puppeteer.launch({
         headless: 'new'
      });

      const page = await browser.newPage();

      await page.setContent(body.html, {
         waitUntil: 'networkidle0'
      });

      const pdfBuffer: Buffer = await page.pdf({
         printBackground: true,
         displayHeaderFooter: true,

         headerTemplate: `
        <div style="
          width: 100%;
          font-size: 10px;
          padding: 0 40px;
          color: #666;
          display: flex;
          justify-content: space-between;
        ">
          <span>${body.title}</span>
          <span></span>
        </div>
      `,

         footerTemplate: `
        <div style="
          width: 100%;
          font-size: 10px;
          padding: 0 40px;
          color: #666;
          display: flex;
          justify-content: space-between;
        ">
          <span></span>
          <span>
            Page <span class="pageNumber"></span>
            of <span class="totalPages"></span>
          </span>
        </div>
      `
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
         headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${body.title
               .replace(/\s+/g, '-')
               .toLowerCase()}.pdf"`
         }
      });
   } catch (error) {
      console.error(error);
      return new NextResponse('PDF export failed', { status: 500 });
   }
}
