function installDOMMatrixPolyfill() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  // pdfjs-dist references DOMMatrix at module load time; this stub lets it initialize.
  // For text extraction we only need the 2-D affine components to be correct.
  class DOMMatrixPolyfill {
    m11: number; m12: number; m13: number; m14: number;
    m21: number; m22: number; m23: number; m24: number;
    m31: number; m32: number; m33: number; m34: number;
    m41: number; m42: number; m43: number; m44: number;
    is2D: boolean; isIdentity: boolean;

    constructor(init?: number[] | string) {
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;
      if (Array.isArray(init) && init.length === 6) {
        this.m11 = init[0]; this.m12 = init[1];
        this.m21 = init[2]; this.m22 = init[3];
        this.m41 = init[4]; this.m42 = init[5];
        this.isIdentity = (init[0] === 1 && init[1] === 0 && init[2] === 0 && init[3] === 1 && init[4] === 0 && init[5] === 0);
      }
    }
    get a() { return this.m11; } set a(v: number) { this.m11 = v; }
    get b() { return this.m12; } set b(v: number) { this.m12 = v; }
    get c() { return this.m21; } set c(v: number) { this.m21 = v; }
    get d() { return this.m22; } set d(v: number) { this.m22 = v; }
    get e() { return this.m41; } set e(v: number) { this.m41 = v; }
    get f() { return this.m42; } set f(v: number) { this.m42 = v; }

    multiply(m: DOMMatrixPolyfill): DOMMatrixPolyfill {
      const r = new DOMMatrixPolyfill();
      r.m11 = this.m11*m.m11 + this.m12*m.m21 + this.m13*m.m31 + this.m14*m.m41;
      r.m12 = this.m11*m.m12 + this.m12*m.m22 + this.m13*m.m32 + this.m14*m.m42;
      r.m21 = this.m21*m.m11 + this.m22*m.m21 + this.m23*m.m31 + this.m24*m.m41;
      r.m22 = this.m21*m.m12 + this.m22*m.m22 + this.m23*m.m32 + this.m24*m.m42;
      r.m41 = this.m41*m.m11 + this.m42*m.m21 + this.m43*m.m31 + this.m44*m.m41;
      r.m42 = this.m41*m.m12 + this.m42*m.m22 + this.m43*m.m32 + this.m44*m.m42;
      return r;
    }
    translate(tx = 0, ty = 0): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty]));
    }
    scale(sx = 1, sy = sx): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0]));
    }
    transformPoint(p: { x?: number; y?: number }) {
      const x = p.x ?? 0, y = p.y ?? 0;
      return { x: this.m11*x + this.m21*y + this.m41, y: this.m12*x + this.m22*y + this.m42, z: 0, w: 1 };
    }
    inverse(): DOMMatrixPolyfill {
      const det = this.m11*this.m22 - this.m12*this.m21;
      if (det === 0) return new DOMMatrixPolyfill();
      return new DOMMatrixPolyfill([
        this.m22/det, -this.m12/det,
        -this.m21/det, this.m11/det,
        (this.m21*this.m42 - this.m22*this.m41)/det,
        (this.m12*this.m41 - this.m11*this.m42)/det,
      ]);
    }
    toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
  }

  (globalThis as unknown as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
}

export async function parseResumePdf(buffer: Buffer): Promise<string> {
  installDOMMatrixPolyfill();

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Point the worker to the file path so Vercel's tracer can locate it.
  // createObjectURL / Worker are not available in Node.js, so pdfjs falls
  // back to a fake (inline) worker automatically when loading fails; giving
  // it the path at least lets it resolve the file from the traced bundle.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pages = doc.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => item.str ?? "")
      .join(" ");
    parts.push(text);
    page.cleanup();
  }

  await doc.destroy();
  return parts.join("\n").trim();
}
