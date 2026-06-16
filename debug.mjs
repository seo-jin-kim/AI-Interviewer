import { chromium } from "playwright";

const id = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("response", async (res) => {
  if (res.url().includes("/api/")) {
    console.log("[response]", res.status(), res.url());
  }
});

await page.goto(`http://localhost:3000/interview/${id}`);
await page.waitForTimeout(2000);
await page.screenshot({ path: "debug.png" });

await browser.close();
