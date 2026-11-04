/** Touch-first devices (phones, tablets): focusing an input pops the keyboard up. */
export function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/**
 * Put the focus on the guess box on desktop. On touch devices focus `fallback`
 * (the image/title area) instead, so the keyboard only opens when the player taps the input.
 */
export function focusGuess(input: HTMLElement | undefined, fallback: HTMLElement | undefined): void {
  if (isTouchDevice()) fallback?.focus({ preventScroll: true })
  else input?.focus()
}
