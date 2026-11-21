"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { lookupBarcode, type BarcodeResult } from "@/lib/actions/openfoodfacts";
import { useT } from "@/components/language-provider";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

function detectorClass(): BarcodeDetectorConstructor | null {
  const candidate = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

type Decode = (video: HTMLVideoElement) => Promise<string | null>;

/**
 * The browser's own reader where it has one (Chrome and Edge on Android, Chrome on Mac);
 * elsewhere (iPhone, Windows) ZXing decodes frames drawn on a canvas. ZXing is only
 * downloaded in that case, when the scanner opens.
 */
async function makeDecoder(): Promise<Decode> {
  const Native = detectorClass();
  if (Native) {
    const detector = new Native({ formats: FORMATS });
    return async (video) => (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
  }
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map<number, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const reader = new BrowserMultiFormatReader(hints);
  const canvas = document.createElement("canvas");
  return async (video) => {
    const width = Math.min(960, video.videoWidth);
    if (!width) return null;
    canvas.width = width;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * width);
    canvas.getContext("2d", { willReadFrequently: true })?.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      return null; // No barcode in this frame.
    }
  };
}

/**
 * Reads a product barcode with the back camera on any browser that gives camera access,
 * and always offers typing the code. The camera stops as
 * soon as a code is read or the dialog closes.
 */
export function BarcodeScanner({ onFound, onClose }: { onFound: (product: BarcodeResult) => void; onClose: () => void }) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"starting" | "on" | "unsupported" | "denied">(() => (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" ? "starting" : "unsupported"));
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const lookUp = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 6 || busy.current) return;
    busy.current = true;
    setCode(digits);
    setMessage(null);
    startTransition(async () => {
      const product = await lookupBarcode(digits);
      busy.current = false;
      if (product) onFound(product);
      else setMessage(t("nutrition.v2.notFound", { code: digits }));
    });
  };

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== "function") return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const decoder = makeDecoder();

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (media) => {
        if (stopped) { media.getTracks().forEach((track) => track.stop()); return; }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play().catch(() => {});
        setCamera("on");
        const decode = await decoder;
        const scan = async () => {
          if (stopped) return;
          if (!busy.current && video.readyState >= 2) {
            const value = await decode(video);
            if (value && !stopped) {
              stream?.getTracks().forEach((track) => track.stop());
              lookUp(value);
              return;
            }
          }
          frame = window.setTimeout(scan, 250);
        };
        void scan();
      })
      .catch(() => setCamera("denied"));

    return () => {
      stopped = true;
      window.clearTimeout(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // The camera starts once per open dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rendered at the body: the scanner has its own form and must not sit inside the meal form.
  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="scan-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-3xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/60"
      data-barcode-scanner
    >
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="scan-title" className="text-lg font-semibold">{t("nutrition.v2.scanTitle")}</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label={t("nutrition.v2.close")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-foreground-muted hover:bg-surface-muted">×</button>
        </div>

        {(camera === "starting" || camera === "on") && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" aria-hidden />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" aria-hidden />
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/90">{camera === "starting" ? t("nutrition.v2.scanStarting") : t("nutrition.v2.scanHint")}</p>
          </div>
        )}
        {camera === "unsupported" && <p className="rounded-xl bg-surface-muted p-3 text-sm text-foreground-muted" data-scan-unsupported>{t("nutrition.v2.scanUnsupported")}</p>}
        {camera === "denied" && <p className="rounded-xl bg-surface-muted p-3 text-sm text-foreground-muted">{t("nutrition.v2.scanDenied")}</p>}

        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); lookUp(code); }}>
          <label htmlFor="barcode-manual" className="text-sm font-medium">{t("nutrition.v2.manualLabel")}</label>
          <div className="flex gap-2">
            <input
              id="barcode-manual"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 16))}
              placeholder={t("nutrition.v2.manualPlaceholder")}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-4 text-base tabular-nums outline-none focus:border-accent"
              dir="ltr"
            />
            <button type="submit" disabled={pending || code.replace(/\D/g, "").length < 6} className="min-h-12 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50">
              {pending ? t("nutrition.v2.lookingUp") : t("nutrition.v2.lookUp")}
            </button>
          </div>
        </form>
        {message && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{message}</p>}
      </div>
    </dialog>,
    document.body
  );
}
