/** Play a short beep using the Web Audio API. No external file needed. */
export function playBeep(frequencyHz = 880, durationMs = 300, volume = 0.3): void {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequencyHz, ctx.currentTime)
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + durationMs / 1000)
    oscillator.onended = () => ctx.close()
  } catch {
    // AudioContext may be blocked in test environment — silently ignore
  }
}
