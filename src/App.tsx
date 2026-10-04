import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Hammer,
  Flame,
  Waves,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
  BookOpen,
  Compass,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BLUEPRINTS, HISTORICAL_NOTES, ToolBlueprint } from './data/blueprints';
import { ForgeCanvas, SparkParticle, getIronColor } from './components/ForgeCanvas';
import { forgeAudio } from './utils/soundEngine';

interface CompletedRecord {
  blueprintId: string;
  bestAccuracy: number;
  strikesUsed: number;
  rating: 'Capolavoro del Maér' | 'Forgiatura Approvata' | 'Pezzo Grezzo';
}

export default function App() {
  const [selectedBlueprintIdx, setSelectedBlueprintIdx] = useState<number>(0);
  const activeBlueprint: ToolBlueprint = BLUEPRINTS[selectedBlueprintIdx];

  const [currentProfile, setCurrentProfile] = useState<number[]>([
    ...BLUEPRINTS[0].initialProfile
  ]);
  const [selectedSegment, setSelectedSegment] = useState<number>(9);
  const [waterFlowLevel, setWaterFlowLevel] = useState<1 | 2 | 3>(2); // 1=Leggero, 2=Medio, 3=Pesante
  const [temperature, setTemperature] = useState<number>(1160); // °C
  const [strikesUsed, setStrikesUsed] = useState<number>(0);
  const [reheatsUsed, setReheatsUsed] = useState<number>(0);
  const [lastStrikeBonus, setLastStrikeBonus] = useState<string>('Pronto a battere');
  const [lastStrikeTimestamp, setLastStrikeTimestamp] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [completedRecords, setCompletedRecords] = useState<Record<string, CompletedRecord>>({});
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);

  const camAngleRef = useRef<number>(0);
  const sparksRef = useRef<SparkParticle[]>([]);

  // Haptic feedback helper for supported Android/mobile browsers
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported devices
      }
    }
  };

  // Compute precision score (0 to 100%) comparing currentProfile to targetProfile
  const calculatePrecision = useCallback((profile: number[], target: number[]): number => {
    let totalError = 0;
    for (let i = 0; i < profile.length; i++) {
      const diff = Math.abs(profile[i] - target[i]);
      const effectiveError = Math.max(0, diff - 1.2);
      totalError += effectiveError;
    }
    const avgError = totalError / profile.length;
    const score = Math.max(0, Math.min(100, 100 - avgError * 4.1));
    return Number(score.toFixed(1));
  }, []);

  const precision = calculatePrecision(currentProfile, activeBlueprint.targetProfile);
  const ironState = getIronColor(temperature);
  const remainingStrikes = Math.max(0, activeBlueprint.maxStrikes - strikesUsed);

  // Switch or reset blueprint
  const loadBlueprint = useCallback((idx: number) => {
    const bp = BLUEPRINTS[idx];
    setSelectedBlueprintIdx(idx);
    setCurrentProfile([...bp.initialProfile]);
    setSelectedSegment(9);
    setTemperature(1160);
    setStrikesUsed(0);
    setReheatsUsed(0);
    setLastStrikeBonus('Massello incandescente estratto dalla forgia');
    setShowEvaluationModal(false);
  }, []);

  // Natural cooling of the incandescent iron over time
  useEffect(() => {
    const interval = setInterval(() => {
      setTemperature((prev) => Math.max(480, prev - 7));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Spawn sparks on anvil impact
  const spawnImpactSparks = (segmentIdx: number, count: number, tempC: number) => {
    const barStartX = 230;
    const barWidth = 560;
    const segWidth = barWidth / 18;
    const originX = barStartX + (segmentIdx + 0.5) * segWidth;
    const originY = 345;
    const colors =
      tempC >= 1000
        ? ['#FEF08A', '#FBBF24', '#FB923C', '#FFFFFF']
        : tempC >= 750
        ? ['#FB923C', '#EA580C', '#F87171']
        : ['#A8A29E', '#78716C'];

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = 90 + Math.random() * 290;
      sparksRef.current.push({
        x: originX + (Math.random() - 0.5) * 24,
        y: originY,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed - 40,
        life: 0.25 + Math.random() * 0.45,
        maxLife: 0.7,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  };

  // Perform a single Hydraulic Hammer Strike
  const handleStrike = useCallback(() => {
    if (strikesUsed >= activeBlueprint.maxStrikes) {
      setShowEvaluationModal(true);
      return;
    }

    const camPhase = ((camAngleRef.current / (Math.PI / 2)) % 1 + 1) % 1;
    const isSweetSpot = camPhase >= 0.65 && camPhase <= 0.92;
    const camMultiplier = isSweetSpot ? 1.25 : 1.0;

    const { malleability } = getIronColor(temperature);

    const forceConfig = {
      1: { depth: 11.5, spread: 1.15, label: 'Colpo Leggero' },
      2: { depth: 20.0, spread: 1.75, label: 'Colpo Medio' },
      3: { depth: 30.5, spread: 2.35, label: 'Colpo Pesante' }
    }[waterFlowLevel];

    const effectiveDepth = forceConfig.depth * malleability * camMultiplier;

    const nextProfile = currentProfile.map((thick, idx) => {
      const dist = Math.abs(idx - selectedSegment);
      if (dist > 4) return thick;
      const gaussian = Math.exp(-(dist * dist) / (2 * forceConfig.spread * forceConfig.spread));
      const reduction = effectiveDepth * gaussian;
      return Math.max(8, Number((thick - reduction).toFixed(1)));
    });

    const newStrikes = strikesUsed + 1;
    setCurrentProfile(nextProfile);
    setStrikesUsed(newStrikes);
    setLastStrikeTimestamp(performance.now());
    setTemperature((t) => Math.max(480, t - 28));

    const newPrecision = calculatePrecision(nextProfile, activeBlueprint.targetProfile);
    forgeAudio.playHammerStrike(waterFlowLevel, temperature, isSweetSpot ? 1 : 0.5);
    triggerHaptic(waterFlowLevel === 3 ? 45 : waterFlowLevel === 2 ? 30 : 18);
    spawnImpactSparks(
      selectedSegment,
      waterFlowLevel * (temperature > 850 ? 18 : 8),
      temperature
    );

    if (isSweetSpot) {
      setLastStrikeBonus(`${forceConfig.label} · Sincronia Camme Perfetta (+25% resa)`);
    } else if (malleability < 0.5) {
      setLastStrikeBonus(`Ferro troppo freddo (${temperature} °C): usa la Tromba Idroeolica!`);
    } else {
      setLastStrikeBonus(`${forceConfig.label} sulla sezione #${selectedSegment + 1}`);
    }

    if (newPrecision >= 92 || newStrikes >= activeBlueprint.maxStrikes) {
      const rating: CompletedRecord['rating'] =
        newPrecision >= 91 && newStrikes <= activeBlueprint.parStrikes
          ? 'Capolavoro del Maér'
          : newPrecision >= 82
          ? 'Forgiatura Approvata'
          : 'Pezzo Grezzo';

      setCompletedRecords((prev) => {
        const existing = prev[activeBlueprint.id];
        if (!existing || newPrecision > existing.bestAccuracy) {
          return {
            ...prev,
            [activeBlueprint.id]: {
              blueprintId: activeBlueprint.id,
              bestAccuracy: newPrecision,
              strikesUsed: newStrikes,
              rating
            }
          };
        }
        return prev;
      });

      if (newPrecision >= 93 || newStrikes >= activeBlueprint.maxStrikes) {
        forgeAudio.playCompletionChime(rating === 'Capolavoro del Maér');
        triggerHaptic([40, 60, 80]);
        setShowEvaluationModal(true);
      }
    }
  }, [
    strikesUsed,
    activeBlueprint,
    temperature,
    waterFlowLevel,
    currentProfile,
    selectedSegment,
    calculatePrecision
  ]);

  // Reheat iron using the historical "Tromba Idroeolica"
  const handleReheat = useCallback(() => {
    forgeAudio.playReheatBellows();
    triggerHaptic(25);
    setTemperature(1200);
    setReheatsUsed((r) => r + 1);
    setLastStrikeBonus('Tromba Idroeolica attivata: massello riportato a 1.200 °C');
  }, []);

  // Keyboard shortcuts for desktop play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setSelectedSegment((s) => Math.max(0, s - 1));
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        setSelectedSegment((s) => Math.min(17, s + 1));
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleStrike();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReheat();
      } else if (e.code === 'Digit1') {
        setWaterFlowLevel(1);
      } else if (e.code === 'Digit2') {
        setWaterFlowLevel(2);
      } else if (e.code === 'Digit3') {
        setWaterFlowLevel(3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStrike, handleReheat]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    forgeAudio.setMuted(next);
  };

  // Evaluate current piece manually at any time
  const handleFinishPiece = () => {
    const rating: CompletedRecord['rating'] =
      precision >= 91 && strikesUsed <= activeBlueprint.parStrikes
        ? 'Capolavoro del Maér'
        : precision >= 82
        ? 'Forgiatura Approvata'
        : 'Pezzo Grezzo';

    setCompletedRecords((prev) => {
      const existing = prev[activeBlueprint.id];
      if (!existing || precision > existing.bestAccuracy) {
        return {
          ...prev,
          [activeBlueprint.id]: {
            blueprintId: activeBlueprint.id,
            bestAccuracy: precision,
            strikesUsed,
            rating
          }
        };
      }
      return prev;
    });
    forgeAudio.playCompletionChime(rating === 'Capolavoro del Maér');
    setShowEvaluationModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0D0C] text-[#F5F2EB]">
      {/* Top Bar Contract: 3 zones (Single brand title, 4 nav links, 2 actions) */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 bg-[#0F0D0C]/95 backdrop-blur-md border-b border-stone-800/80">
        <a
          href="#fucina"
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#F5F2EB] whitespace-nowrap"
        >
          Maglio Calvi
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-400">
          <a
            href="#fucina"
            className="hover:text-[#F5F2EB] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            La Fucina
          </a>
          <a
            href="#stampi"
            className="hover:text-[#F5F2EB] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Attrezzi Storici
          </a>
          <a
            href="#meccanica"
            className="hover:text-[#F5F2EB] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Meccanica Idraulica
          </a>
          <a
            href="#storia"
            className="hover:text-[#F5F2EB] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Comenduno 1438–1972
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleMute}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-300 bg-stone-900 border border-stone-800 rounded-xl hover:bg-stone-800 transition-colors whitespace-nowrap cursor-pointer"
            title={isMuted ? 'Attiva suoni del maglio' : 'Silenzia audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-stone-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
            <span className="hidden sm:inline">{isMuted ? 'Audio Off' : 'Suoni Fucina'}</span>
          </button>

          <button
            onClick={() => loadBlueprint(selectedBlueprintIdx)}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-500 rounded-xl hover:bg-amber-400 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nuovo Pezzo</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        id="fucina"
        className="flex-1 w-full max-w-[1380px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-10"
      >
        {/* Mobile Quick Tool Switcher Carousel (Horizontal Thumb Bar on Smartphone) */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {BLUEPRINTS.map((bp, idx) => {
            const active = idx === selectedBlueprintIdx;
            const done = completedRecords[bp.id];
            return (
              <button
                key={bp.id}
                onClick={() => loadBlueprint(idx)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-2 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold shadow-sm'
                    : 'bg-[#171412] text-stone-300 border-stone-800'
                }`}
              >
                <span>{bp.name}</span>
                {done && (
                  <span
                    className={`text-[11px] font-mono-tabular ${
                      active ? 'text-stone-900' : 'text-emerald-400'
                    }`}
                  >
                    ✓ {done.bestAccuracy}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Intro Header (Compact on mobile so the anvil is immediately in view) */}
        <section className="hidden sm:flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-stone-800/80">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400/90 font-medium">
              <span>Comenduno di Albino (Bergamo)</span>
              <span aria-hidden="true">·</span>
              <span>Museo Etnografico della Torre</span>
              <span aria-hidden="true">·</span>
              <span>Sfida di Forgiatura in Pochi Colpi</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-[#F5F2EB] text-balance">
              Modella il Ferro Incandescente sotto il Martello del Maglio
            </h1>
          </div>

          <p className="text-sm text-stone-400 max-w-md leading-relaxed">
            Regola l’apertura della chiusa idraulica, scalda il massello con la{' '}
            <strong className="text-stone-200 font-medium">tromba idroeolica</strong> e cala il
            pesante maglio in pochi colpi mirati per scolpire la sagoma storica.
          </p>
        </section>

        {/* Two-Zone Sandbox Layout: Interactive Stage + Ergonomic Thumb Deck */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT STAGE: Telemetry + Interactive Hydraulic Forge Canvas */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4">
            {/* Compact 3-Column Mobile / 4-Column Desktop Telemetry Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-[#1A1614] border border-stone-800/90">
              <div>
                <div className="text-[11px] sm:text-xs text-stone-400">Colpi Maglio</div>
                <div className="mt-0.5 flex items-baseline gap-1.5 font-mono-tabular">
                  <span
                    className={`text-lg sm:text-2xl font-semibold ${
                      strikesUsed <= activeBlueprint.parStrikes
                        ? 'text-emerald-400'
                        : strikesUsed < activeBlueprint.maxStrikes
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {strikesUsed}/{activeBlueprint.maxStrikes}
                  </span>
                  <span className="hidden sm:inline text-xs text-stone-400">
                    (Par {activeBlueprint.parStrikes})
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] sm:text-xs text-stone-400">Precisione</div>
                <div className="mt-0.5 flex items-baseline gap-1.5 font-mono-tabular">
                  <span
                    className={`text-lg sm:text-2xl font-semibold ${
                      precision >= 90
                        ? 'text-emerald-400'
                        : precision >= 75
                        ? 'text-amber-400'
                        : 'text-stone-200'
                    }`}
                  >
                    {precision.toFixed(1)}%
                  </span>
                  <span className="hidden sm:inline text-xs text-stone-400">
                    {precision >= 91 ? '● Ottimo' : precision >= 80 ? '◐ Buono' : '○ Grezzo'}
                  </span>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <div className="text-[11px] sm:text-xs text-stone-400">Calore Ferro</div>
                <div className="mt-0.5 flex items-baseline justify-between gap-1">
                  <span
                    className="text-lg sm:text-xl font-semibold font-mono-tabular"
                    style={{ color: ironState.core }}
                  >
                    {temperature}°C
                  </span>
                  <span className="hidden sm:inline text-xs text-stone-300 truncate">
                    {ironState.label}
                  </span>
                  <span className="sm:hidden text-[10px] text-stone-400 truncate">
                    {ironState.shortLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Canvas */}
            <ForgeCanvas
              currentProfile={currentProfile}
              targetProfile={activeBlueprint.targetProfile}
              selectedSegment={selectedSegment}
              onSelectSegment={setSelectedSegment}
              onStrikeNow={handleStrike}
              temperature={temperature}
              waterFlowLevel={waterFlowLevel}
              camAngleRef={camAngleRef}
              lastStrikeTimestamp={lastStrikeTimestamp}
              sparksRef={sparksRef}
              isStrikingAnim={false}
            />

            {/* Status Feedback Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#1A1614] border border-stone-800/80 text-xs">
              <div className="flex items-center gap-2 text-stone-300">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="line-clamp-1">{lastStrikeBonus}</span>
              </div>
              <div className="text-stone-400 font-mono-tabular text-[11px] sm:text-xs">
                Par ideale: ≤{activeBlueprint.parStrikes} colpi · Rimasti: {remainingStrikes}
              </div>
            </div>
          </div>

          {/* RIGHT / BOTTOM THUMB DECK: Mobile-First Ergonomic Controls (>= 44x44px hitboxes) */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-5 bg-[#1A1614] border border-stone-800/90 rounded-2xl p-4 sm:p-5">
            {/* Primary Thumb Actions FIRST on Mobile so user can play with one thumb without scrolling */}
            <div className="space-y-3">
              {/* 1. Position Tongs along the Anvil (Segments 1..18) with >= 48px touch step buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="segment-slider" className="font-medium text-stone-200">
                    1. Posizione Tenaglie sull’Incudine
                  </label>
                  <span className="font-mono-tabular text-amber-400 font-semibold">
                    Sez. #{selectedSegment + 1} / 18
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSelectedSegment((s) => Math.max(0, s - 1));
                    }}
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-stone-900 border border-stone-700/80 text-stone-100 hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
                    aria-label="Sposta ferro a sinistra"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <input
                    id="segment-slider"
                    type="range"
                    min={0}
                    max={17}
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(Number(e.target.value))}
                    className="w-full h-8 accent-amber-500 cursor-pointer"
                  />

                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSelectedSegment((s) => Math.min(17, s + 1));
                    }}
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-stone-900 border border-stone-700/80 text-stone-100 hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
                    aria-label="Sposta ferro a destra"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-between text-[11px] text-stone-400 font-mono-tabular px-1">
                  <span>Spessore: {Math.round(currentProfile[selectedSegment])} mm</span>
                  <span>Target: {activeBlueprint.targetProfile[selectedSegment]} mm</span>
                  <span
                    className={
                      Math.abs(
                        currentProfile[selectedSegment] -
                          activeBlueprint.targetProfile[selectedSegment]
                      ) <= 2
                        ? 'text-emerald-400 font-semibold'
                        : 'text-amber-400'
                    }
                  >
                    Scarto:{' '}
                    {Math.round(
                      currentProfile[selectedSegment] -
                        activeBlueprint.targetProfile[selectedSegment]
                    )}{' '}
                    mm
                  </span>
                </div>
              </div>

              {/* 2. Hydraulic Sluice Gate / Force Selector (44px+ buttons) */}
              <div className="space-y-2 pt-2 border-t border-stone-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-200 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    2. Chiusa Idraulica (Forza)
                  </span>
                  <span className="font-mono-tabular text-sky-300">
                    {waterFlowLevel === 1
                      ? 'Rifinitura (-11mm)'
                      : waterFlowLevel === 2
                      ? 'Media (-20mm)'
                      : 'Sbozzatura (-30mm)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800">
                  {(
                    [
                      { level: 1, label: 'Leggero' },
                      { level: 2, label: 'Medio' },
                      { level: 3, label: 'Pesante' }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.level}
                      onClick={() => {
                        triggerHaptic(12);
                        setWaterFlowLevel(item.level);
                      }}
                      className={`min-h-[44px] py-2 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        waterFlowLevel === item.level
                          ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Large Thumb-Zone Primary Action Buttons (52px height for primary strike) */}
              <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
                <button
                  onClick={handleStrike}
                  disabled={remainingStrikes === 0}
                  className="w-full min-h-[52px] flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-[#EA580C] hover:bg-[#F97316] disabled:bg-stone-800 disabled:text-stone-500 text-white font-semibold text-base shadow-lg transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap select-none"
                >
                  <Hammer className="w-5 h-5 shrink-0" />
                  <span>
                    {remainingStrikes > 0
                      ? `Cala il Maglio (Colpo ${strikesUsed + 1}/${activeBlueprint.maxStrikes})`
                      : 'Colpi Esauriti · Valuta Pezzo'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={handleReheat}
                    className="min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] border border-stone-700/80 text-amber-300 text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none"
                  >
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Scalda Ferro</span>
                  </button>

                  <button
                    onClick={handleFinishPiece}
                    className="min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] border border-stone-700/80 text-emerald-300 text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none"
                  >
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Consegna Pezzo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Blueprint Details & Historical Context */}
            <div className="pt-4 border-t border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  Stampo {selectedBlueprintIdx + 1} di {BLUEPRINTS.length}
                </span>
                <span className="text-amber-400 font-medium">{activeBlueprint.difficulty}</span>
              </div>

              <h2 className="font-display text-lg sm:text-xl font-semibold text-[#F5F2EB]">
                {activeBlueprint.name}{' '}
                <span className="text-sm font-normal text-amber-400/90 italic">
                  ({activeBlueprint.dialectName})
                </span>
              </h2>

              <p className="text-xs text-stone-300 leading-relaxed">
                {activeBlueprint.description}
              </p>

              <p className="text-[11px] text-stone-400 pt-1">
                <strong className="text-stone-200">Consiglio del Maér:</strong>{' '}
                {activeBlueprint.recommendedForce}
              </p>

              <div className="pt-2 border-t border-stone-800/60 text-xs text-stone-400 leading-relaxed space-y-1">
                <div className="text-stone-200 font-medium flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Archivio Storico Maglio Calvi</span>
                </div>
                <p>{activeBlueprint.historicalContext}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Blueprint Catalog ("Attrezzi Storici della Valle Seriana") */}
        <section id="stampi" className="space-y-4 pt-4 border-t border-stone-800/80">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F2EB]">
                Catalogo degli Stampi Storici di Comenduno
              </h2>
              <p className="text-sm text-stone-400">
                Scegli quale ferro da taglio o attrezzo agricolo forgiare. Ottieni oltre il 91% di
                precisione entro i colpi ideali per il grado di{' '}
                <strong className="text-amber-400 font-medium">Capolavoro del Maér</strong>.
              </p>
            </div>
            <div className="text-xs text-stone-400 font-mono-tabular">
              Stampi completati: {Object.keys(completedRecords).length} / {BLUEPRINTS.length}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {BLUEPRINTS.map((bp, idx) => {
              const isSelected = idx === selectedBlueprintIdx;
              const record = completedRecords[bp.id];
              return (
                <button
                  key={bp.id}
                  onClick={() => {
                    loadBlueprint(idx);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#221C18] border-amber-500/80 shadow-md'
                      : 'bg-[#171412] border-stone-800/80 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span>{bp.difficulty}</span>
                      <span className="font-mono-tabular">Par {bp.parStrikes} colpi</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-[#F5F2EB]">
                      {bp.name}
                    </h3>
                    <div className="text-xs text-amber-400/90 italic">{bp.dialectName}</div>
                  </div>

                  {/* Mini SVG silhouette preview of targetProfile */}
                  <div className="w-full h-10 bg-stone-950/90 rounded-lg p-1.5 flex items-end">
                    <svg viewBox="0 0 180 40" className="w-full h-full overflow-visible">
                      <polygon
                        points={[
                          '0,38',
                          ...bp.targetProfile.map(
                            (v, i) => `${i * 10 + 5},${38 - (v / 70) * 34}`
                          ),
                          '180,38'
                        ].join(' ')}
                        fill={
                          isSelected ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.25)'
                        }
                        stroke={isSelected ? '#F59E0B' : '#38BDF8'}
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800/70">
                    {record ? (
                      <span className="text-emerald-400 font-mono-tabular flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {record.bestAccuracy}% ({record.strikesUsed} colpi)
                      </span>
                    ) : (
                      <span className="text-stone-400">Da forgiare</span>
                    )}
                    <span className="text-stone-300 font-medium">
                      {isSelected ? 'Attivo' : 'Scegli →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Historical & Mechanical Heritage of Maglio Calvi */}
        <section id="meccanica" className="space-y-5 pt-6 border-t border-stone-800/80">
          <div className="max-w-2xl space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F2EB]">
              L’Ingegneria dell’Acqua e del Fuoco al Maglio Calvi
            </h2>
            <p className="text-sm text-stone-400">
              Scopri come funzionava la storica fucina idraulica di Comenduno di Albino, rimasta
              operativa per oltre due secoli fino al 1972 e oggi custodita dalla Fondazione Maglio
              Calvi ETS.
            </p>
          </div>

          <div id="storia" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {HISTORICAL_NOTES.map((note) => (
              <article
                key={note.id}
                className="p-5 rounded-2xl bg-[#171412] border border-stone-800/80 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-semibold text-[#F5F2EB]">
                    {note.title}
                  </h3>
                  <div className="text-xs text-amber-400/90 font-medium">{note.subtitle}</div>
                  <p className="text-sm text-stone-300 leading-relaxed">{note.body}</p>
                </div>
                <div className="pt-3 border-t border-stone-800/80 text-xs text-stone-400 font-mono-tabular flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{note.technicalSpec}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Evaluation / Victory Modal (Bottom Sheet on Mobile, Centered Dialog on Desktop) */}
      {showEvaluationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#1A1614] border-t sm:border border-stone-700 p-5 sm:p-6 shadow-2xl space-y-5">
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden w-10 h-1.5 bg-stone-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-amber-400 font-medium">
                  Verifica sul Banco del Maér · {activeBlueprint.name}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F2EB]">
                  {precision >= 91 && strikesUsed <= activeBlueprint.parStrikes
                    ? 'Capolavoro del Maér!'
                    : precision >= 80
                    ? 'Attrezzo Forgiato con Successo'
                    : 'Forgiatura Incompleta'}
                </h3>
              </div>
              {precision >= 80 ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              )}
            </div>

            <p className="text-sm text-stone-300 leading-relaxed">
              {precision >= 91 && strikesUsed <= activeBlueprint.parStrikes
                ? `Straordinario! Hai modellato "${activeBlueprint.dialectName}" in soli ${strikesUsed} colpi di maglio (obiettivo ≤ ${activeBlueprint.parStrikes}), mantenendo una fedeltà millimetrica alla sagoma storica.`
                : precision >= 80
                ? `Buon lavoro alla fucina! La lama ha raggiunto una precisione del ${precision.toFixed(
                    1
                  )}% in ${strikesUsed} colpi. Prova a sfruttare la zona ambra dell'albero a camme per usare ancora meno colpi.`
                : `Il massello richiede maggiore precisione (${precision.toFixed(
                    1
                  )}%). Ricorda di scaldare il ferro con la Tromba Idroeolica quando scende sotto gli 850 °C e di dosare la chiusa dell'acqua.`}
            </p>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 font-mono-tabular">
              <div>
                <div className="text-[11px] sm:text-xs text-stone-400">Precisione</div>
                <div className="text-lg sm:text-xl font-semibold text-emerald-400">
                  {precision.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-stone-400">Colpi Usati</div>
                <div className="text-lg sm:text-xl font-semibold text-amber-400">
                  {strikesUsed} / {activeBlueprint.parStrikes}
                </div>
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-stone-400">Riscaldate</div>
                <div className="text-lg sm:text-xl font-semibold text-stone-200">{reheatsUsed}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() =>
                  loadBlueprint((selectedBlueprintIdx + 1) % BLUEPRINTS.length)
                }
                className="min-h-[48px] sm:order-3 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                Prossimo Attrezzo →
              </button>
              <button
                onClick={() => loadBlueprint(selectedBlueprintIdx)}
                className="min-h-[46px] sm:order-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-100 cursor-pointer whitespace-nowrap"
              >
                Riprova Stampo
              </button>
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="min-h-[46px] sm:order-1 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-medium text-stone-200 cursor-pointer whitespace-nowrap"
              >
                Continua a Rifinire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="mt-8 sm:mt-12 border-t border-stone-800/80 py-6 px-4 sm:px-6 text-xs text-stone-400">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            Omaggio interattivo al <strong className="text-stone-200">Maglio Calvi</strong> di
            Comenduno di Albino (BG) · Patrimonio di Archeologia Industriale della Valle Seriana
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.magliocalvi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline whitespace-nowrap"
            >
              Visita www.magliocalvi.it ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
