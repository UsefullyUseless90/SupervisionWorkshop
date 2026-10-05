import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser';
import { Camera, Keyboard, ScanLine, X, AlertCircle, Loader2, Type } from 'lucide-react';
import { OcrScanner } from '@/components/OcrScanner';

export type ScanMode = 'camera' | 'keyboard' | 'ocr';

type CameraState = 'idle' | 'starting' | 'active' | 'error';

interface BarcodeScannerProps {
  onDetected: (value: string) => void;
  placeholder?: string;
  label?: string;
  mode?: ScanMode;
  onModeChange?: (mode: ScanMode) => void;
  disabled?: boolean;
}

export function BarcodeScanner({
  onDetected,
  placeholder = 'Scanner ou saisir une valeur...',
  label = 'Scanner',
  mode: initialMode = 'camera',
  onModeChange,
  disabled = false,
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [manualValue, setManualValue] = useState('');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const keyboardBufferRef = useRef('');
  const keyboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ value: string; time: number }>({
    value: '',
    time: 0,
  });

  const handleModeChange = useCallback(
    (m: ScanMode) => {
      setMode(m);
      onModeChange?.(m);
      setManualValue('');
      setCameraError(null);
    },
    [onModeChange]
  );

  const triggerDetection = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const now = Date.now();
      if (
        lastScanRef.current.value === trimmed &&
        now - lastScanRef.current.time < 2000
      ) {
        return;
      }
      lastScanRef.current = { value: trimmed, time: now };
      onDetected(trimmed);
    },
    [onDetected]
  );

  // Keyboard wedge mode: PDA and barcode readers type fast then send Enter
  useEffect(() => {
    if (mode !== 'keyboard') return;

    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (keyboardBufferRef.current) {
          triggerDetection(keyboardBufferRef.current);
          keyboardBufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        keyboardBufferRef.current += e.key;
        if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
        keyboardTimerRef.current = setTimeout(() => {
          keyboardBufferRef.current = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
    };
  }, [mode, disabled, triggerDetection]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setCameraState('idle');
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraState('starting');

    try {
      if (!videoRef.current) {
        setCameraState('error');
        setCameraError("Élément vidéo non disponible.");
        return;
      }

      const reader =
        readerRef.current ?? new BrowserMultiFormatReader();
      readerRef.current = reader;

      let deviceList: MediaDeviceInfo[] = [];
      try {
        deviceList =
          await BrowserMultiFormatReader.listVideoInputDevices();
      } catch {
        // listVideoInputDevices may fail if permissions not yet granted
      }
      setDevices(deviceList);

      let deviceId: string | undefined = undefined;
      if (deviceList.length > 0) {
        // Prefer back/rear camera on mobile
        const back = deviceList.find((d) =>
          d.label.toLowerCase().match(/back|rear|environment|arriere/)
        );
        deviceId =
          deviceList[deviceIndex]?.deviceId ||
          back?.deviceId ||
          deviceList[0].deviceId;
      }

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, _err) => {
          if (result) {
            triggerDetection(result.getText());
          }
        }
      );
      controlsRef.current = controls;
      setCameraState('active');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Permission') ||
        msg.includes('NotAllowed') ||
        msg.includes('denied')
      ) {
        setCameraError(
          "Accès caméra refusé. Autorisez l'accès à la caméra dans votre navigateur, puis réessayez."
        );
      } else if (
        msg.includes('NotFound') ||
        msg.includes('DevicesNotFound')
      ) {
        setCameraError(
          "Aucune caméra détectée. Branchez une caméra ou utilisez le mode clavier/PDA."
        );
      } else if (msg.includes('NotReadable')) {
        setCameraError(
          "La caméra est déjà utilisée par une autre application. Fermez-la et réessayez."
        );
      } else {
        setCameraError(
          `Impossible de démarrer la caméra: ${msg}. Utilisez le mode clavier/PDA.`
        );
      }
      setCameraState('error');
    }
  }, [deviceIndex, triggerDetection]);

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    stopCamera();
    setDeviceIndex((prev) => (prev + 1) % devices.length);
    // Restart after state + cleanup settles
    setTimeout(() => startCamera(), 300);
  }, [devices.length, stopCamera, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, []);

  // Stop camera when switching away from camera mode
  useEffect(() => {
    if (mode !== 'camera') {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      setCameraState('idle');
    }
  }, [mode]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleModeChange('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'camera'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera size={16} />
            Caméra
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('ocr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'ocr'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type size={16} />
            Texte (OCR)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('keyboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'keyboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Keyboard size={16} />
            Clavier / PDA
          </button>
        </div>
      </div>

      {mode === 'camera' && (
        <div className="space-y-3">
          {/* Video container — always rendered so the ref is available */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Idle overlay */}
            {cameraState === 'idle' && (
              <button
                type="button"
                onClick={startCamera}
                disabled={disabled}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 hover:bg-slate-900/70 transition-colors disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <Camera size={28} className="text-white" />
                </div>
                <span className="text-sm font-medium text-white">
                  Activer la caméra
                </span>
              </button>
            )}

            {/* Starting overlay */}
            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80">
                <Loader2 size={32} className="animate-spin text-white" />
                <span className="text-sm text-white">
                  Démarrage de la caméra...
                </span>
              </div>
            )}

            {/* Active overlay — scan frame + close */}
            {cameraState === 'active' && (
              <>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 border-2 border-white/70 rounded-lg" />
                  <ScanLine
                    size={24}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80 animate-pulse"
                  />
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X size={18} />
                </button>
              </>
            )}

            {/* Error overlay */}
            {cameraState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 p-4">
                <AlertCircle size={32} className="text-amber-400" />
                <span className="text-sm text-white text-center max-w-xs">
                  {cameraError}
                </span>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Error message below video (also shown when error) */}
          {cameraState === 'error' && cameraError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Switch camera button */}
          {cameraState === 'active' && devices.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="w-full py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Changer de caméra
            </button>
          )}
        </div>
      )}

      {mode === 'ocr' && (
        <OcrScanner onDetected={triggerDetection} disabled={disabled} />
      )}

      {mode === 'keyboard' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            <Keyboard size={18} className="shrink-0" />
            <span>
              Le scan PDA/lecteur est détecté automatiquement. Vous pouvez aussi
              saisir manuellement.
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualValue.trim()) {
                triggerDetection(manualValue.trim());
                setManualValue('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus
              className="flex-1 px-4 py-3 text-lg border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={disabled || !manualValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Valider
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
