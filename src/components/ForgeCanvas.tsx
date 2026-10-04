import React, { useEffect, useRef } from 'react';

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ForgeCanvasProps {
  currentProfile: number[];
  targetProfile: number[];
  selectedSegment: number;
  onSelectSegment: (index: number) => void;
  onStrikeNow: () => void;
  temperature: number; // 450 to 1220 °C
  waterFlowLevel: 1 | 2 | 3; // Controls force & cam speed
  camAngleRef: React.MutableRefObject<number>;
  lastStrikeTimestamp: number;
  sparksRef: React.MutableRefObject<SparkParticle[]>;
  isStrikingAnim: boolean;
}

/**
 * Returns realistic incandescent iron color based on temperature in Celsius
 */
export function getIronColor(tempC: number): {
  core: string;
  edge: string;
  glow: string;
  label: string;
  shortLabel: string;
  malleability: number;
} {
  if (tempC >= 1080) {
    return {
      core: '#FFF3B0',
      edge: '#F59E0B',
      glow: 'rgba(251, 191, 36, 0.55)',
      label: 'Giallo Incandescente · Massima Resa',
      shortLabel: 'Resa 100%',
      malleability: 1.0
    };
  }
  if (tempC >= 900) {
    return {
      core: '#FB923C',
      edge: '#EA580C',
      glow: 'rgba(234, 88, 12, 0.45)',
      label: 'Arancio Vivo · Ottima Forgiabilità',
      shortLabel: 'Resa 85%',
      malleability: 0.85
    };
  }
  if (tempC >= 720) {
    return {
      core: '#DC2626',
      edge: '#991B1B',
      glow: 'rgba(220, 38, 38, 0.28)',
      label: 'Rosso Ciliegia · Resa Media',
      shortLabel: 'Resa 60%',
      malleability: 0.6
    };
  }
  return {
    core: '#57534E',
    edge: '#292524',
    glow: 'rgba(120, 113, 108, 0.08)',
    label: 'Ferro Freddo · Riattiva la Tromba Idroeolica!',
    shortLabel: 'Freddo!',
    malleability: 0.25
  };
}

export const ForgeCanvas: React.FC<ForgeCanvasProps> = ({
  currentProfile,
  targetProfile,
  selectedSegment,
  onSelectSegment,
  onStrikeNow,
  temperature,
  waterFlowLevel,
  camAngleRef,
  lastStrikeTimestamp,
  sparksRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragMovedRef = useRef<boolean>(false);
  const startSegmentRef = useRef<number>(selectedSegment);

  const getSegmentFromPointer = (e: React.PointerEvent<HTMLCanvasElement>): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const barStartX = 230;
    const barEndX = 790;
    const segWidth = (barEndX - barStartX) / currentProfile.length;

    // Generous vertical hitbox for smartphone touch fingers
    if (clickX >= barStartX - 35 && clickX <= barEndX + 35 && clickY >= 160 && clickY <= 455) {
      return Math.max(
        0,
        Math.min(currentProfile.length - 1, Math.floor((clickX - barStartX) / segWidth))
      );
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const idx = getSegmentFromPointer(e);
    if (idx !== null) {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      startSegmentRef.current = selectedSegment;
      if (idx !== selectedSegment) {
        onSelectSegment(idx);
        dragMovedRef.current = true;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const idx = getSegmentFromPointer(e);
    if (idx !== null && idx !== selectedSegment) {
      onSelectSegment(idx);
      dragMovedRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
    const idx = getSegmentFromPointer(e);
    // If user tapped directly on the already selected segment without sliding, trigger a strike
    if (!dragMovedRef.current && idx === startSegmentRef.current) {
      onStrikeNow();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Advance hydraulic wheel & 4-cam shaft angle
      const angularSpeed = 1.15 + waterFlowLevel * 0.42;
      camAngleRef.current = (camAngleRef.current + angularSpeed * dt) % (Math.PI * 2);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // 1. Background stone workshop wall & ambient hearth glow
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#14110F');
      bgGrad.addColorStop(0.65, '#1A1613');
      bgGrad.addColorStop(1, '#120F0D');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle stone block grid texture on background
      ctx.strokeStyle = 'rgba(255, 248, 235, 0.028)';
      ctx.lineWidth = 1;
      for (let row = 0; row < H; row += 44) {
        ctx.beginPath();
        ctx.moveTo(0, row);
        ctx.lineTo(W, row);
        ctx.stroke();
        const offset = (row / 44) % 2 === 0 ? 0 : 48;
        for (let col = offset; col < W; col += 96) {
          ctx.beginPath();
          ctx.moveTo(col, row);
          ctx.lineTo(col, row + 44);
          ctx.stroke();
        }
      }

      // 2. Ambient Hearth / Tromba Idroeolica Glow
      const ironColors = getIronColor(temperature);
      const barStartX = 230;
      const barEndX = 790;
      const barWidth = barEndX - barStartX;
      const segWidth = barWidth / currentProfile.length;
      const selectedX = barStartX + (selectedSegment + 0.5) * segWidth;
      const anvilSurfaceY = 380;

      const hearthGlow = ctx.createRadialGradient(
        selectedX,
        anvilSurfaceY - 25,
        15,
        selectedX,
        anvilSurfaceY - 25,
        260
      );
      hearthGlow.addColorStop(0, ironColors.glow);
      hearthGlow.addColorStop(1, 'rgba(15, 13, 12, 0)');
      ctx.fillStyle = hearthGlow;
      ctx.fillRect(0, 0, W, H);

      // 3. Draw Left Hydraulic Waterwheel & 4-Cam Wooden Spindle
      const wheelCenterX = 102;
      const wheelCenterY = 178;
      const wheelRadius = 68;

      // Water stream falling from the upper canal ("Roggia Serio")
      const sluiceWidth = 10 + waterFlowLevel * 6;
      const waterGrad = ctx.createLinearGradient(30, 20, 65, 260);
      waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      waterGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.35)');
      waterGrad.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(wheelCenterX - wheelRadius - 12, 18, sluiceWidth, 245);

      // Wooden Waterwheel Rim & Paddles
      ctx.save();
      ctx.translate(wheelCenterX, wheelCenterY);
      ctx.rotate(-camAngleRef.current);

      ctx.strokeStyle = '#57412F';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#3E2E21';
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
        ctx.lineTo(Math.cos(a) * (wheelRadius + 8), Math.sin(a) * (wheelRadius + 8));
        ctx.stroke();
      }

      // 4 Iron Cams
      for (let i = 0; i < 4; i++) {
        const camA = (i * Math.PI) / 2;
        ctx.save();
        ctx.rotate(camA);
        ctx.fillStyle = '#A8A29E';
        ctx.strokeStyle = '#44403C';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, -6, 26, 12, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Inner wooden hub
      ctx.fillStyle = '#292019';
      ctx.strokeStyle = '#78716C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const camPhase = ((camAngleRef.current / (Math.PI / 2)) % 1 + 1) % 1;
      const isSweetSpot = camPhase >= 0.65 && camPhase <= 0.92;

      const timeSinceStrike = now - lastStrikeTimestamp;
      let hammerLift = 0;
      if (timeSinceStrike < 165) {
        const t = timeSinceStrike / 165;
        hammerLift = t < 0.28 ? 0 : (t - 0.28) / 0.72;
      } else {
        hammerLift = 0.35 + 0.65 * Math.sin(camPhase * Math.PI * 0.92);
      }

      // 4. Draw Massive Stone Fulcrum Pillars ("Lo Scagno in pietra")
      ctx.fillStyle = '#2E2A27';
      ctx.strokeStyle = '#44403C';
      ctx.lineWidth = 2;
      ctx.fillRect(195, 115, 38, 175);
      ctx.strokeRect(195, 115, 38, 175);

      ctx.fillStyle = '#D6D3D1';
      ctx.beginPath();
      ctx.arc(214, 174, 7, 0, Math.PI * 2);
      ctx.fill();

      // 5. Draw Heavy Oscillating Wooden Beam & Hammer Head
      const hammerHeadY = anvilSurfaceY - 58 - hammerLift * 76;

      ctx.save();
      ctx.strokeStyle = '#5C4028';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(132, 174 + (hammerLift - 0.5) * 26);
      ctx.lineTo(214, 174);
      ctx.lineTo(selectedX, hammerHeadY - 46);
      ctx.stroke();

      ctx.strokeStyle = '#1C1917';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(214, 174);
      ctx.lineTo(selectedX, hammerHeadY - 46);
      ctx.stroke();

      const headWidth = waterFlowLevel === 3 ? 64 : waterFlowLevel === 2 ? 52 : 42;
      const headGrad = ctx.createLinearGradient(
        selectedX - headWidth / 2,
        hammerHeadY - 52,
        selectedX + headWidth / 2,
        hammerHeadY
      );
      headGrad.addColorStop(0, '#57534E');
      headGrad.addColorStop(0.5, '#78716C');
      headGrad.addColorStop(1, '#292524');

      ctx.fillStyle = headGrad;
      ctx.strokeStyle = isSweetSpot ? '#F59E0B' : '#A8A29E';
      ctx.lineWidth = isSweetSpot ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.roundRect(selectedX - headWidth * 0.38, hammerHeadY - 54, headWidth * 0.76, 32, 4);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(selectedX - headWidth / 2, hammerHeadY - 24, headWidth, 24, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 6. Draw Massive Stone & Iron Anvil Base
      const anvilTopY = anvilSurfaceY;
      ctx.fillStyle = '#262320';
      ctx.strokeStyle = '#44403C';
      ctx.lineWidth = 2;
      ctx.fillRect(barStartX - 30, anvilTopY + 18, barWidth + 60, 62);
      ctx.strokeRect(barStartX - 30, anvilTopY + 18, barWidth + 60, 62);

      const anvilGrad = ctx.createLinearGradient(barStartX, anvilTopY, barStartX, anvilTopY + 20);
      anvilGrad.addColorStop(0, '#78716C');
      anvilGrad.addColorStop(0.4, '#57534E');
      anvilGrad.addColorStop(1, '#292524');
      ctx.fillStyle = anvilGrad;
      ctx.fillRect(barStartX - 16, anvilTopY, barWidth + 32, 20);

      // 7. Draw Blacksmith Tongs
      const leftBarThickness = currentProfile[0] * 1.45;
      ctx.strokeStyle = '#78716C';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(barStartX - 75, anvilTopY - leftBarThickness / 2 - 14);
      ctx.lineTo(barStartX + 10, anvilTopY - leftBarThickness + 4);
      ctx.moveTo(barStartX - 75, anvilTopY - leftBarThickness / 2 + 14);
      ctx.lineTo(barStartX + 10, anvilTopY - 2);
      ctx.stroke();

      // 8. Draw Glowing Incandescent Iron Billet Profile
      const heightScale = 1.45;
      ctx.save();
      ctx.shadowColor = ironColors.glow;
      ctx.shadowBlur = temperature > 750 ? 22 : 4;

      const ironGrad = ctx.createLinearGradient(barStartX, anvilTopY - 95, barStartX, anvilTopY);
      ironGrad.addColorStop(0, ironColors.edge);
      ironGrad.addColorStop(0.55, ironColors.core);
      ironGrad.addColorStop(1, ironColors.edge);

      ctx.fillStyle = ironGrad;
      ctx.strokeStyle = temperature > 850 ? '#FEF08A' : '#78716C';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(barStartX, anvilTopY);
      for (let i = 0; i < currentProfile.length; i++) {
        const x = barStartX + i * segWidth + segWidth / 2;
        const y = anvilTopY - currentProfile[i] * heightScale;
        if (i === 0) {
          ctx.lineTo(barStartX, y);
        }
        ctx.lineTo(x, y);
        if (i === currentProfile.length - 1) {
          ctx.lineTo(barEndX, y);
        }
      }
      ctx.lineTo(barEndX, anvilTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 9. Draw Blueprint Target Silhouette Overlay
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      for (let i = 0; i < targetProfile.length; i++) {
        const x = barStartX + i * segWidth + segWidth / 2;
        const y = anvilTopY - targetProfile[i] * heightScale;
        if (i === 0) {
          ctx.moveTo(barStartX, y);
        }
        ctx.lineTo(x, y);
        if (i === targetProfile.length - 1) {
          ctx.lineTo(barEndX, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 10. Draw Segment Alignment Guides & Delta Indicators
      for (let i = 0; i < currentProfile.length; i++) {
        const segCenterX = barStartX + (i + 0.5) * segWidth;
        const currY = anvilTopY - currentProfile[i] * heightScale;
        const targY = anvilTopY - targetProfile[i] * heightScale;
        const diffMm = Math.round(currentProfile[i] - targetProfile[i]);
        const isSelected = i === selectedSegment;

        if (isSelected) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
          ctx.fillRect(barStartX + i * segWidth, anvilTopY - 125, segWidth, 125);

          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.strokeRect(barStartX + i * segWidth + 1, anvilTopY - 125, segWidth - 2, 125);
        }

        ctx.font = isSelected
          ? '600 12px "JetBrains Mono", monospace'
          : '400 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';

        ctx.fillStyle = isSelected ? '#FDBA74' : '#A8A29E';
        ctx.fillText(`${i + 1}`, segCenterX, anvilTopY + 15);

        if (Math.abs(diffMm) <= 2) {
          ctx.fillStyle = '#34D399';
          ctx.fillText('OK', segCenterX, anvilTopY + 38);
        } else if (diffMm > 2) {
          ctx.fillStyle = isSelected ? '#FBBF24' : '#E7E5E4';
          ctx.fillText(`-${diffMm}`, segCenterX, anvilTopY + 38);
        } else {
          ctx.fillStyle = '#F87171';
          ctx.fillText(`${diffMm}`, segCenterX, anvilTopY + 38);
        }

        ctx.fillStyle = Math.abs(diffMm) <= 2 ? '#34D399' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(segCenterX, targY, isSelected ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (Math.abs(diffMm) > 2) {
          ctx.strokeStyle = diffMm > 0 ? 'rgba(251, 191, 36, 0.45)' : 'rgba(248, 113, 113, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(segCenterX, currY);
          ctx.lineTo(segCenterX, targY);
          ctx.stroke();
        }
      }

      // 11. Draw Cam Synchronization Timing Meter at top-left
      const meterX = 230;
      const meterY = 22;
      const meterW = 240;
      const meterH = 16;

      ctx.fillStyle = '#1C1917';
      ctx.strokeStyle = '#44403C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(meterX, meterY, meterW, meterH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.fillRect(meterX + meterW * 0.65, meterY + 1, meterW * 0.27, meterH - 2);

      const needleX = meterX + camPhase * meterW;
      ctx.fillStyle = isSweetSpot ? '#FBBF24' : '#E7E5E4';
      ctx.fillRect(needleX - 2.5, meterY - 3, 5, meterH + 6);

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = isSweetSpot ? '#FBBF24' : '#A8A29E';
      ctx.fillText(
        isSweetSpot
          ? '● COLPO PERFETTO (+25% Resa)'
          : '○ Sincronia Camme (attendi zona ambra)',
        meterX + meterW + 14,
        meterY + 12
      );

      // 12. Legend at top-right of canvas
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('--- Sagoma Storica Obiettivo (mm)', W - 24, 64);
      ctx.fillStyle = ironColors.core;
      ctx.fillText('■ Ferro Incandescente Attuale', W - 24, 82);

      // 13. Update & Render Incandescent Sparks
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 460 * dt;
        p.life -= dt;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    currentProfile,
    targetProfile,
    selectedSegment,
    temperature,
    waterFlowLevel,
    camAngleRef,
    lastStrikeTimestamp,
    sparksRef
  ]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-stone-800 bg-[#14110F] shadow-2xl">
      <canvas
        ref={canvasRef}
        width={840}
        height={440}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-auto block cursor-pointer select-none touch-none"
        aria-label="Banco di forgiatura interattivo del Maglio Calvi. Trascina il dito sulla barra per mirare o tocca la sezione attiva per calare il maglio."
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-stone-950/90 border-t border-stone-800/80 text-xs text-stone-400">
        <span className="hidden sm:inline">
          <strong className="text-stone-200 font-medium">Controllo Diretto:</strong> Trascina o clicca una sezione (1–18) per posizionare il ferro · Clicca di nuovo (o premi <kbd className="px-1.5 py-0.5 bg-stone-800 text-stone-200 rounded font-mono-tabular">SPAZIO</kbd>) per calare il maglio
        </span>
        <span className="sm:hidden text-[11px] text-stone-300">
          Scorri col dito sulla barra per mirare · Tocca 2 volte per battere
        </span>
        <span className="font-mono-tabular text-[11px] sm:text-xs text-amber-300/95">
          Sez. #{selectedSegment + 1}: {Math.round(currentProfile[selectedSegment])}mm → {targetProfile[selectedSegment]}mm
        </span>
      </div>
    </div>
  );
};
