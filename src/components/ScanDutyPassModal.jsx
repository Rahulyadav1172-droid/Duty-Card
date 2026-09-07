import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
  MapPin,
  Clock,
  Phone,
  UserCheck,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { resolvePoliceRank, stripRankFromName } from '../utils/rankResolver';

export default function ScanDutyPassModal({
  isOpen,
  onClose,
  allRecords = [],
  currentEvent = {},
  onSelectDuty,
  onMarkAttendance
}) {
  const [scannerStatus, setScannerStatus] = useState('scanning'); // 'scanning' | 'success' | 'unmatched_event' | 'invalid' | 'error'
  const [verifiedRecord, setVerifiedRecord] = useState(null);
  const [scannedRawData, setScannedRawData] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const readerId = 'duty-pass-qr-reader-viewport';

  // Beep Audio
  const playBeepSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }, []);

  // Stop Scanner instance safely
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (e) {}
      try {
        scanner.clear();
      } catch (e) {}
    }
  }, []);

  // Scan Success Processor
  const handleScanSuccess = useCallback(async (decodedText) => {
    // Haptic feedback
    try {
      navigator.vibrate?.([80, 50, 80]);
    } catch (e) {}

    playBeepSound();
    await stopScanner();
    setScannedRawData(decodedText);

    // 1. Extract search term or parsed object
    let searchTerm = '';
    let parsedJson = null;

    try {
      if (decodedText.trim().startsWith('{') && decodedText.trim().endsWith('}')) {
        parsedJson = JSON.parse(decodedText);
      }
    } catch (e) {}

    if (parsedJson) {
      searchTerm = parsedJson.pno || parsedJson.mobile || parsedJson.id || parsedJson.name || '';
    } else {
      // Check if it is a URL with search parameter
      try {
        if (decodedText.includes('?search=')) {
          const urlObj = new URL(decodedText);
          searchTerm = urlObj.searchParams.get('search') || '';
        } else if (decodedText.includes('/')) {
          const urlParts = decodedText.split('/');
          searchTerm = urlParts[urlParts.length - 1];
        } else {
          searchTerm = decodedText.trim();
        }
      } catch (e) {
        searchTerm = decodedText.trim();
      }
    }

    const cleanTerm = searchTerm.replace(/\D/g, '');
    const cleanRaw = searchTerm.trim().toLowerCase();

    // Find match in current event records
    const matched = (Array.isArray(allRecords) ? allRecords : []).find((rec) => {
      const recMob = String(rec.mobile || '').replace(/\D/g, '');
      const recPno = String(rec.pno || '').trim().toLowerCase();
      const recId = String(rec.id || '').trim().toLowerCase();
      const recName = String(rec.name || '').trim().toLowerCase();

      if (cleanTerm && cleanTerm.length >= 6 && recMob.includes(cleanTerm)) return true;
      if (cleanTerm && cleanTerm.length >= 6 && recPno.includes(cleanTerm)) return true;
      if (cleanRaw && recId === cleanRaw) return true;
      if (cleanRaw && recPno === cleanRaw) return true;
      if (cleanRaw && recName && (recName === cleanRaw || recName.includes(cleanRaw))) return true;

      // Also check if parsed JSON matched
      if (parsedJson && parsedJson.id && rec.id === parsedJson.id) return true;
      if (parsedJson && parsedJson.name && rec.name === parsedJson.name && rec.duty_place === parsedJson.duty_place) return true;

      return false;
    });

    if (matched) {
      setVerifiedRecord(matched);
      setScannerStatus('success');
    } else if (parsedJson && (parsedJson.name || parsedJson.duty_place)) {
      setVerifiedRecord(parsedJson);
      setScannerStatus('unmatched_event');
    } else {
      setVerifiedRecord(null);
      setScannerStatus('invalid');
    }
  }, [allRecords, playBeepSound, stopScanner]);

  // Start Scanner on mount or facingMode change
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerStatus('scanning');
        setErrorMessage('');

        // Wait a tick for DOM element to render
        await new Promise((resolve) => setTimeout(resolve, 150));

        const element = document.getElementById(readerId);
        if (!element || !isMounted) return;

        // Clean any existing instance
        await stopScanner();

        const qrScanner = new Html5Qrcode(readerId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.75);
            return {
              width: Math.min(qrboxSize, 280),
              height: Math.min(qrboxSize, 280)
            };
          },
          aspectRatio: 1.0
        };

        await qrScanner.start(
          { facingMode },
          config,
          (decodedText) => {
            if (isMounted) {
              handleScanSuccess(decodedText);
            }
          },
          () => {}
        );

        // Check torch capabilities
        try {
          const capabilities = qrScanner.getRunningTrackCapabilities?.();
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        } catch (e) {}
      } catch (err) {
        if (!isMounted) return;
        console.warn('Camera scan start error:', err);
        setScannerStatus('error');
        setErrorMessage(
          err?.message?.includes('Permission')
            ? 'कैमरा अनुमति (Permission) अस्वीकृत कर दी गई है। कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें।'
            : 'कैमरा प्रारंभ करने में असमर्थ। कृपया सुनिश्चित करें कि कैमरा किसी अन्य ऐप में खुला नहीं है।'
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [facingMode, handleScanSuccess, stopScanner]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Switch Front/Back Camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Fallback: Scan from Image file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopScanner();
      setScannerStatus('scanning');
      const qrScanner = new Html5Qrcode(readerId);
      html5QrCodeRef.current = qrScanner;

      const decodedText = await qrScanner.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      setScannerStatus('invalid');
      setErrorMessage('चित्र से कोई वैध QR कोड नहीं पढ़ा जा सका। कृपया स्पष्ट तस्वीर चुनें।');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Restart Scanning
  const handleScanAgain = () => {
    setVerifiedRecord(null);
    setScannedRawData('');
    setErrorMessage('');
    setScannerStatus('scanning');
  };

  const handleClose = () => {
    stopScanner();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-devanagari select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                डिजिटल ड्यूटी पास चेकिंग स्कैनर
              </h2>
              <p className="text-[11px] text-amber-400 font-bold truncate">
                {currentEvent?.title || 'अयोध्या पुलिस सुरक्षा व्यवस्था'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white active:scale-90 bg-slate-800 hover:bg-slate-700 transition cursor-pointer touch-manipulation"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ================================================================= */}
          {/* 1. ACTIVE SCANNER CAMERA VIEWPORT                                  */}
          {/* ================================================================= */}
          {scannerStatus === 'scanning' && (
            <div className="space-y-4">
              <div className="relative mx-auto w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-black border-2 border-amber-400 shadow-xl flex items-center justify-center">
                {/* Viewport container for html5-qrcode */}
                <div id={readerId} className="w-full h-full object-cover" />

                {/* Animated Laser Scanning Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce pointer-events-none" />

                {/* Reticle Corner Brackets */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl pointer-events-none" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br pointer-events-none" />
              </div>

              {/* Instructions */}
              <div className="text-center space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  जवान के ड्यूटी पास पर अंकित QR कोड को फ्रेम के बीच में रखें
                </p>
                <p className="text-[11px] text-slate-400">
                  स्कैनर कोड को स्वतः पहचान कर तत्काल सत्यापन प्रदर्शित करेगा
                </p>
              </div>

              {/* Camera Controls Toolbar */}
              <div className="flex items-center justify-center gap-2.5 pt-1">
                {/* Switch Camera (Front/Back) */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer touch-manipulation"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>कैमरा बदलें</span>
                </button>

                {/* Torch / Flashlight Toggle (if supported) */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border active:scale-95 cursor-pointer touch-manipulation ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${torchOn ? 'fill-current' : 'text-amber-400'}`} />
                    <span>{torchOn ? 'टॉर्च बंद' : 'टॉर्च ऑन'}</span>
                  </button>
                )}

                {/* Upload from Gallery / File */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer touch-manipulation"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>फ़ोटो से स्कैन</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. SUCCESS: 100% VERIFIED POLICE DUTY PASS CARD                   */}
          {/* ================================================================= */}
          {scannerStatus === 'success' && verifiedRecord && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Verified Header Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                  <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1">
                    <span>आधिकारिक डिजिटल सत्यापित ड्यूटी पास</span>
                    <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-200/90 font-medium truncate">
                    अयोध्या पुलिस सुरक्षा व्यवस्था डेटाबेस में सत्यापित
                  </div>
                </div>
              </div>

              {/* Officer Details Card */}
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 space-y-3.5 shadow-md">
                {/* Officer Profile Row */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-700/60">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-amber-400/80 flex items-center justify-center text-amber-400 shrink-0 overflow-hidden shadow-md">
                    {verifiedRecord.photo ? (
                      <img
                        src={verifiedRecord.photo}
                        alt="Officer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/badge.png"
                        alt="Emblem"
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 uppercase tracking-wide">
                        {resolvePoliceRank(verifiedRecord.rank, verifiedRecord.name)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {verifiedRecord.pno ? `PNO: ${verifiedRecord.pno}` : `ID: ${verifiedRecord.id}`}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight truncate">
                      {stripRankFromName(verifiedRecord.name)}
                    </h3>

                    <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                      {verifiedRecord.posting || 'थाना कोतवाली'} {verifiedRecord.district ? `(${verifiedRecord.district})` : ''}
                    </div>
                  </div>
                </div>

                {/* Duty Assignment Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Point */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-0.5 sm:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>तैनाती स्थल (Duty Point)</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                      {verifiedRecord.duty_place || 'सामान्य सुरक्षा व्यवस्था'}
                    </div>
                  </div>

                  {/* Zone */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ज़ोन (Zone)</div>
                    <div className="font-bold text-slate-200">{verifiedRecord.zone || 'सामान्य ज़ोन'}</div>
                  </div>

                  {/* Sector */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">सेक्टर (Sector)</div>
                    <div className="font-bold text-slate-200">{verifiedRecord.sector || 'सामान्य सेक्टर'}</div>
                  </div>

                  {/* Shift */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-0.5 sm:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>ड्यूटी पाली / समय (Shift)</span>
                    </div>
                    <div className="font-bold text-emerald-300">{verifiedRecord.shift || 'प्रातः 08:00 बजे से 20:30 बजे तक'}</div>
                  </div>
                </div>

                {/* Mobile Direct Calling Contact */}
                {verifiedRecord.mobile && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-white tracking-wide">
                        {verifiedRecord.mobile}
                      </span>
                    </div>
                    <a
                      href={`tel:${verifiedRecord.mobile}`}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer touch-manipulation"
                    >
                      <span>कॉल करें</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Open Full Duty Card */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectDuty?.(verifiedRecord);
                    handleClose();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer touch-manipulation"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>पूर्ण कार्ड देखें</span>
                </button>

                {/* Mark Verified Attendance */}
                {onMarkAttendance && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAttendance?.(verifiedRecord.id || verifiedRecord.pno);
                      alert(`जवान ${verifiedRecord.name} की फील्ड उपस्थिति सत्यापित दर्ज कर दी गई!`);
                    }}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer touch-manipulation"
                  >
                    <UserCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>उपस्थिति लगाएं</span>
                  </button>
                )}

                {/* Scan Another Pass Button */}
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="col-span-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer touch-manipulation"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>अगला पास स्कैन करें</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. UNMATCHED EVENT / ARCHIVED EVENT PASS                           */}
          {/* ================================================================= */}
          {scannerStatus === 'unmatched_event' && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-300">
                  अन्य सुरक्षा इवेंट का पास!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  स्कैन किए गए QR कोड में जवान{' '}
                  <strong className="text-white font-bold">{verifiedRecord?.name}</strong> का विवरण
                  प्राप्त हुआ, लेकिन यह वर्तमान सक्रिय इवेंट{' '}
                  <strong className="text-amber-400 font-bold">
                    "{currentEvent?.title || 'सक्रिय इवेंट'}"
                  </strong>{' '}
                  के डेटाबेस में पंजीकृत नहीं है।
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanAgain}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition"
              >
                पुनः स्कैन करें
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* 4. INVALID / UNREGISTERED QR CODE ALERT                            */}
          {/* ================================================================= */}
          {scannerStatus === 'invalid' && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3.5 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-300">
                  अमान्य अथवा अपंजीकृत QR कोड!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {errorMessage ||
                    'इस QR कोड में कोई वैध पुलिस ड्यूटी पास रिकॉर्ड नहीं मिला। कृपया सुनिश्चित करें कि जवान का आधिकारिक पुलिस ड्यूटी पास ही स्कैन किया जा रहा है।'}
                </p>
                {scannedRawData && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-950 font-mono text-[10px] text-slate-400 break-all max-h-16 overflow-y-auto">
                    {scannedRawData}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleScanAgain}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition"
              >
                पुनः स्कैन करें
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* 5. ERROR / PERMISSION DENIED STATE                                */}
          {/* ================================================================= */}
          {scannerStatus === 'error' && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3.5 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-300">कैमरा एक्सेस त्रुटि</h3>
                <p className="text-xs text-slate-300 mt-1">{errorMessage}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition"
                >
                  पुनः प्रयास करें
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer active:scale-95 transition"
                >
                  गैलरी से चुनें
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
