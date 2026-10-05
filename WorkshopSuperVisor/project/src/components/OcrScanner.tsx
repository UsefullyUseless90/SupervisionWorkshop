import { useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  AlertCircle,
  Loader2,
  Check,
  RotateCcw,
  Type,
  Image as ImageIcon,
} from 'lucide-react';

interface OcrScannerProps {
  onDetected: (value: string) => void;
  disabled?: boolean;
}

type OcrState = 'idle' | 'camera' | 'captured' | 'processing' | 'result' | 'error';

export function OcrScanner({ onDetected, disabled = false }: OcrScannerProps) {
  const [state, setState] = useState<OcrState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedImageRef = useRef<string | null>(null);
  const lastScanRef = useRef<{ value: string; time: number }>({
    value: '',
    time: 0,
  });

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setState('camera');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      // Wait for videoRef to be available (it's rendered in 'camera' state)
      requestAnimationFrame(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError(
          "Accès caméra refusé. Autorisez l'accès à la caméra dans votre navigateur."
        );
      } else if (msg.includes('NotFound')) {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError(`Erreur caméra: ${msg}`);
      }
      setState('error');
    }
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    capturedImageRef.current = canvas.toDataURL('image/png');

    stopStream();
    setState('captured');
  }, [stopStream]);

  const runOcr = useCallback(async () => {
    if (!capturedImageRef.current) return;
    setState('processing');
    setProgress(0);
    setError(null);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('fra', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const {
        data: { text, confidence: conf },
      } = await worker.recognize(capturedImageRef.current);
      await worker.terminate();

      const cleaned = text
        .trim()
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .join('\n');

      setOcrText(cleaned);
      setConfidence(conf);
      setEditedText(cleaned.split('\n')[0] || cleaned);
      setState('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Échec de la reconnaissance texte: ${msg}`);
      setState('error');
    }
  }, []);

  const confirmResult = useCallback(() => {
    const value = editedText.trim();
    if (!value) return;
    const now = Date.now();
    if (
      lastScanRef.current.value === value &&
      now - lastScanRef.current.time < 2000
    ) {
      return;
    }
    lastScanRef.current = { value, time: now };
    onDetected(value);
    reset();
  }, [editedText, onDetected]);

  function reset() {
    stopStream();
    capturedImageRef.current = null;
    setOcrText('');
    setEditedText('');
    setConfidence(0);
    setProgress(0);
    setError(null);
    setState('idle');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm">
        <Type size={18} className="shrink-0" />
        <span>
          Photographiez la référence imprimée sur le dossier. Le texte reconnu
          pourra être vérifié et corrigé avant validation.
        </span>
      </div>

      {/* Idle */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={startCamera}
          disabled={disabled}
          className="w-full flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
            <Camera size={28} className="text-white" />
          </div>
          <span className="text-sm font-medium text-slate-700">
            Photographier le texte
          </span>
        </button>
      )}

      {/* Camera live */}
      {state === 'camera' && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-16 border-2 border-white/70 rounded-lg" />
            </div>
            <button
              type="button"
              onClick={() => {
                stopStream();
                reset();
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Cadrez la référence imprimée dans le rectangle blanc
          </p>
          <button
            type="button"
            onClick={capture}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            <Camera size={24} />
            Capturer
          </button>
        </div>
      )}

      {/* Captured — review before OCR */}
      {state === 'captured' && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <img
              src={capturedImageRef.current || undefined}
              alt="Capture"
              className="w-full max-h-[300px] object-contain"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reprendre
            </button>
            <button
              type="button"
              onClick={runOcr}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Type size={18} />
              Lire le texte
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {state === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 size={40} className="animate-spin text-purple-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              Reconnaissance du texte en cours...
            </p>
            <div className="mt-3 w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{progress}%</p>
          </div>
        </div>
      )}

      {/* Result */}
      {state === 'result' && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black mb-3">
            <img
              src={capturedImageRef.current || undefined}
              alt="Capture"
              className="w-full max-h-[200px] object-contain"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Texte reconnu
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  confidence > 80
                    ? 'bg-green-100 text-green-700'
                    : confidence > 50
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                Confiance: {Math.round(confidence)}%
              </span>
            </div>

            {/* Full OCR output */}
            {ocrText && ocrText !== editedText && (
              <details className="mb-3">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                  Voir tout le texte détecté
                </summary>
                <pre className="mt-2 text-xs text-slate-500 whitespace-pre-wrap font-mono p-2 bg-white rounded border border-slate-200 max-h-32 overflow-y-auto">
                  {ocrText}
                </pre>
              </details>
            )}

            {/* Editable field */}
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Référence à valider (modifiable)
            </label>
            <input
              type="text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 text-lg font-medium border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
            />
            {confidence < 50 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                Confiance faible — vérifiez attentivement la référence.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Recommencer
            </button>
            <button
              type="button"
              onClick={confirmResult}
              disabled={!editedText.trim()}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Recommencer
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
