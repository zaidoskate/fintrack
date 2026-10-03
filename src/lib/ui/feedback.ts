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

/**
 * Sintetiza un chime suave y elegante usando Web Audio API.
 * Emite dos tonos suaves (880Hz y 1760Hz) con un decaimiento corto.
 */
export function playSuccessChime() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    
    // Tono base (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    
    // Armónico (A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime);
    
    // Envolventes
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);
    
    osc2.start(ctx.currentTime + 0.03); // Ligeramente desfasado
    osc2.stop(ctx.currentTime + 0.23);
  } catch (err) {
    console.warn('AudioContext no soportado o bloqueado', err);
  }
}
