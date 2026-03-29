"use client";
import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Rect { x: number; y: number; w: number; h: number }

export default function AppPage() {
  const { data: session } = useSession();
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const rectsRef = useRef<Rect[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) loadImage(file);
  }, []);

  const loadImage = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError("File too large (max 10MB)"); return; }
    setImageFile(file);
    setResult(null);
    setRects([]);
    rectsRef.current = [];
    setError(null);
    setLimitReached(false);
    const url = URL.createObjectURL(file);
    setImage(url);
  };

  const drawCanvas = (currentRects: Rect[], extra?: Rect) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !canvas.width) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const allRects = extra ? [...currentRects, extra] : currentRects;
    allRects.forEach((r) => {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(99,102,241,0.15)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
  };

  const onImgLoad = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    drawCanvas([]);
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startPos.current = getCanvasPos(e);
    setDrawing(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!startPos.current) return;
    const pos = getCanvasPos(e);
    const r = { x: startPos.current.x, y: startPos.current.y, w: pos.x - startPos.current.x, h: pos.y - startPos.current.y };
    drawCanvas(rectsRef.current, r);
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!startPos.current) return;
    const pos = getCanvasPos(e);
    const r = { x: startPos.current.x, y: startPos.current.y, w: pos.x - startPos.current.x, h: pos.y - startPos.current.y };
    if (Math.abs(r.w) > 5 && Math.abs(r.h) > 5) {
      const newRects = [...rectsRef.current, r];
      rectsRef.current = newRects;
      setRects(newRects);
      drawCanvas(newRects);
    }
    setDrawing(false);
    startPos.current = null;
  };

  const buildMask = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = imgRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      rectsRef.current.forEach((r) => {
        ctx.fillStyle = "white";
        ctx.fillRect(r.x, r.y, r.w, r.h);
      });
      canvas.toBlob((b) => resolve(b!), "image/png");
    });
  };

  const handleProcess = async () => {
    if (!imageFile || rectsRef.current.length === 0) { setError("Please select at least one watermark area"); return; }
    setLoading(true);
    setError(null);
    try {
      const mask = await buildMask();
      const form = new FormData();
      form.append("image", imageFile);
      form.append("mask", mask, "mask.png");
      const res = await fetch("/api/process", { method: "POST", body: form });
      if (res.status === 429) {
        const data = await res.json();
        setLimitReached(true);
        setError(data.error);
        return;
      }
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setImage(null); setImageFile(null); setResult(null);
    setRects([]); rectsRef.current = []; setError(null); setLimitReached(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-indigo-400">dewatermark.ai</Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link>
          {session ? (
            <>
              <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition">Dashboard</Link>
              <span className="text-gray-400">{session.user?.email} · {(session.user as any)?.isPro ? "Pro ✨" : `${(session.user as any)?.usageCount ?? 0}/5 today`}</span>
            </>
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-white">Login</Link>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Remove Watermark</h1>
        <p className="text-gray-400 mb-8">Upload image → Draw over watermark → Process</p>

        {!image ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("fileInput")?.click()}
            className="border-2 border-dashed border-gray-700 rounded-2xl p-20 text-center cursor-pointer hover:border-indigo-500 transition"
          >
            <div className="text-5xl mb-4">🖼️</div>
            <p className="text-gray-400">Drag & drop or click to upload</p>
            <p className="text-gray-600 text-sm mt-2">JPG, PNG, WEBP · Max 10MB</p>
            <input id="fileInput" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Canvas editor */}
            {!result && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Draw rectangles over watermark areas:</p>
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-xl border border-gray-700 cursor-crosshair"
                  style={{ imageRendering: "pixelated" }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                />
                <img ref={imgRef} src={image} className="hidden" onLoad={onImgLoad} alt="" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { rectsRef.current = []; setRects([]); drawCanvas([]); }} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded-lg">Reset</button>
                  <button onClick={() => { const r = rectsRef.current.slice(0, -1); rectsRef.current = r; setRects(r); drawCanvas(r); }} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded-lg">Undo</button>
                  <span className="text-sm text-gray-500 self-center">{rects.length} area{rects.length !== 1 ? "s" : ""} selected</span>
                </div>
              </div>
            )}

            {/* Before/After slider */}
            {result && (
              <div className="relative rounded-xl overflow-hidden border border-gray-700" style={{ height: 400 }}>
                <img src={image} className="absolute inset-0 w-full h-full object-contain" alt="Original" />
                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                  <img src={result} className="w-full h-full object-contain" alt="Result" />
                </div>
                <div className="absolute inset-y-0 flex items-center" style={{ left: `${sliderPos}%` }}>
                  <div className="w-0.5 h-full bg-white opacity-80" />
                  <div className="absolute bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg -translate-x-1/2 text-gray-800 font-bold text-xs">⟺</div>
                </div>
                <input type="range" min={0} max={100} value={sliderPos} onChange={(e) => setSliderPos(+e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
                <div className="absolute top-2 left-2 bg-black/50 text-xs px-2 py-1 rounded">Before</div>
                <div className="absolute top-2 right-2 bg-black/50 text-xs px-2 py-1 rounded">After</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm">
                {error}
                {limitReached && (
                  <div className="mt-2 flex gap-2">
                    {!session && <Link href="/login" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg text-white">Sign up free</Link>}
                    <Link href="/pricing" className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-lg text-white">Upgrade to Pro</Link>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!result ? (
                <button
                  onClick={handleProcess}
                  disabled={loading || rects.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl font-semibold transition flex items-center gap-2"
                >
                  {loading ? <><span className="animate-spin inline-block">⏳</span> Processing...</> : "Remove Watermark"}
                </button>
              ) : (
                <>
                  <a href={result} download="dewatermarked.png" className="bg-green-600 hover:bg-green-500 px-6 py-2.5 rounded-xl font-semibold transition">Download</a>
                  <button onClick={() => { setResult(null); setRects([]); rectsRef.current = []; }} className="border border-gray-700 hover:border-gray-500 px-6 py-2.5 rounded-xl transition">Try Again</button>
                </>
              )}
              <button onClick={resetAll} className="text-gray-500 hover:text-gray-300 px-4 py-2.5 transition">New Image</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
