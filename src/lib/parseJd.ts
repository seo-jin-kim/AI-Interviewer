import * as cheerio from "cheerio";

export async function fetchJdText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("JD 페이지 응답이 너무 느려요 (15초 초과). 다른 링크로 시도해주세요.");
    }
    throw new Error("JD 링크에 접속할 수 없습니다. 링크를 다시 확인해주세요.");
  }

  if (!res.ok) {
    throw new Error(`JD 페이지를 불러오지 못했습니다 (status ${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, header, footer, nav").remove();

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new Error("JD 페이지에서 텍스트를 추출하지 못했습니다");
  }

  return text.slice(0, 12000);
}
