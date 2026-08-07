import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronsRight, ShieldAlert } from 'lucide-react';

interface SliderCaptchaProps {
  /** Dipanggil setiap kali status verifikasi berubah (true saat slider mencapai ujung kanan). */
  onVerify: (verified: boolean) => void;
  /** Ubah nilai ini (mis. increment counter) untuk memaksa slider reset dari luar (contoh: setelah error submit). */
  resetSignal?: number | string;
  /** Menonaktifkan interaksi, misalnya saat captcha sumber (soal) sedang dimuat dari server. */
  disabled?: boolean;
  label?: string;
  verifiedLabel?: string;
}

/**
 * Komponen slider verifikasi murni React (tanpa library eksternal).
 * User harus menggeser tombol dari ujung kiri ke ujung kanan hingga 100%
 * untuk dianggap 'verified'. State internal berbasis useState + listener
 * pointer/touch pada document agar drag tetap halus walau kursor keluar dari track.
 */
const SliderCaptcha: React.FC<SliderCaptchaProps> = ({
  onVerify,
  resetSignal,
  disabled = false,
  label = 'Geser untuk verifikasi',
  verifiedLabel = 'Terverifikasi',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [progress, setProgress] = useState(0); // 0 - 100
  const [dragging, setDragging] = useState(false);
  const [verified, setVerified] = useState(false);
  const [shake, setShake] = useState(false);

  // Reset slider setiap kali resetSignal berubah (mis. captcha soal baru dimuat / submit gagal)
  useEffect(() => {
    setProgress(0);
    setVerified(false);
    setDragging(false);
    draggingRef.current = false;
  }, [resetSignal]);

  const computeProgress = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const knobSize = 44; // px, harus selaras dengan lebar tombol slider di JSX
    const usableWidth = Math.max(rect.width - knobSize, 1);
    const raw = ((clientX - rect.left - knobSize / 2) / usableWidth) * 100;
    return Math.min(100, Math.max(0, raw));
  }, []);

  const finishDrag = useCallback(
    (finalProgress: number) => {
      draggingRef.current = false;
      setDragging(false);
      if (finalProgress >= 96) {
        setProgress(100);
        setVerified(true);
        onVerify(true);
      } else {
        setProgress(0);
        setVerified(false);
        setShake(true);
        window.setTimeout(() => setShake(false), 420);
        onVerify(false);
      }
    },
    [onVerify]
  );

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!draggingRef.current || verified) return;
      setProgress(computeProgress(clientX));
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      finishDrag(computeProgress(e.clientX));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = e.changedTouches[0];
      finishDrag(touch ? computeProgress(touch.clientX) : progress);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [computeProgress, finishDrag, progress, verified]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || verified) return;
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
  };

  const handleReset = () => {
    if (disabled) return;
    setProgress(0);
    setVerified(false);
    onVerify(false);
  };

  return (
    <div className="select-none">
      <div
        ref={trackRef}
        className={`relative h-12 w-full overflow-hidden rounded-full border transition-colors ${
          verified
            ? 'border-emerald-300 bg-emerald-50'
            : shake
              ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-slate-100'
        } ${disabled ? 'opacity-60' : ''} ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
      >
        {/* Fill di belakang knob */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] ${
            verified ? 'bg-emerald-200' : 'bg-red-100'
          } ${dragging ? '' : 'duration-200 ease-out'}`}
          style={{ width: `calc(${progress}% + 44px)` }}
        />

        {/* Teks instruksi di tengah track */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide">
          {verified ? (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Check className="h-3.5 w-3.5" /> {verifiedLabel}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500">
              {label}
              <ChevronsRight className="h-3.5 w-3.5 animate-pulse" />
            </span>
          )}
        </div>

        {/* Tombol / knob yang digeser */}
        <div
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          role="slider"
          aria-label="Geser untuk verifikasi captcha"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled || verified) return;
            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              finishDrag(100);
            }
          }}
          className={`absolute top-1 left-1 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors ${
            disabled ? 'cursor-not-allowed' : verified ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          } ${verified ? 'bg-emerald-500 text-white' : 'bg-white text-red-600 ring-1 ring-slate-200'} ${
            dragging ? '' : 'transition-[left] duration-200 ease-out'
          }`}
          style={{ left: `calc((100% - 44px) * ${progress / 100})` }}
        >
          {verified ? <Check className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
        </div>
      </div>

      {!verified && (
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || progress === 0}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ShieldAlert className="h-3 w-3" /> Reset slider
        </button>
      )}
    </div>
  );
};

export default SliderCaptcha;
