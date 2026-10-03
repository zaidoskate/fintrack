'use client';

/**
 * Dispara una vibración háptica suave si el dispositivo lo soporta.
 */
export function triggerHaptic(type: 'light' | 'success' | 'warning') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  
  switch (type) {
    case 'light':
      navigator.vibrate(8);
      break;
    case 'success':
      navigator.vibrate([12, 30, 15]);
      break;
    case 'warning':
      navigator.vibrate([20, 20, 20]);
      break;
  }
}

export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Un arpegio brillante: C6 (1046.5Hz), E6 (1318.5Hz), G6 (1567.9Hz)
    const notes = [1046.5, 1318.5, 1567.9];
    const duration = 0.8;
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + (i * 0.1); // Arpegio separado por 100ms
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05); // Attack más marcado
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay largo
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  } catch (err) {
    console.warn('AudioContext no soportado o bloqueado', err);
  }
}

