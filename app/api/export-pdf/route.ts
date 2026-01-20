import { NextRequest, NextResponse } from "next/server";
import { chromium, firefox, webkit, Browser } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportPdfBody = {
   html: string;
   title: string;
   engine?: "chromium" | "firefox" | "webkit";
};

async function getBrowser(engine: "chromium" | "firefox" | "webkit"): Promise<Browser> {
   if (engine === "firefox") return firefox.launch({ headless: true });
   if (engine === "webkit") return webkit.launch({ headless: true });
   return chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
   });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
   let browser: Browser | null = null;

   try {
      const body: ExportPdfBody = await req.json();
      browser = await getBrowser(body.engine || "chromium");

      const context = await browser.newContext({
         deviceScaleFactor: 1,
      });

      const page = await context.newPage();

      await page.setContent(body.html, { waitUntil: "load" });

      // If your editor is screen-styled, this helps matching font/line-height rendering
      await page.emulateMedia({ media: "screen" });

      // Wait for fonts (critical to match line wrapping / heights)
      await page.evaluate(() => (document as any).fonts?.ready);
      await page.waitForTimeout(50); // tiny settle time for layout after fonts

      const pdfBuffer = await page.pdf({
         format: "A4",
         printBackground: true,
         preferCSSPageSize: true,
         displayHeaderFooter: false,
         margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" }, // CSS @page controls it
         scale: 1,
      });

      const filename = `${body.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
         headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
         },
      });
   } catch (err: any) {
      return new NextResponse(JSON.stringify({ error: err?.message || "PDF export failed" }), {
         status: 500,
         headers: { "Content-Type": "application/json" },
      });
   } finally {
      if (browser) await browser.close();
   }
}
