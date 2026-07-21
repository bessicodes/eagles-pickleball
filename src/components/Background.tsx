'use client';

/**
 * Ambient app background: pure-dark base with soft radial mesh gradients
 * (lime top-left, violet bottom-right). Rendered with a static painted
 * gradient so it stays GPU-cheap (no per-frame repaint of huge blurs).
 * The film-grain noise overlay lives on <body> via the `.noise` class.
 */
export default function Background() {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        background:
          'radial-gradient(60% 45% at 15% 8%, rgba(214,255,0,0.15), transparent 60%),' +
          'radial-gradient(65% 50% at 92% 96%, rgba(138,92,255,0.13), transparent 62%),' +
          'radial-gradient(50% 40% at 50% 30%, rgba(138,92,255,0.05), transparent 70%),' +
          '#0A0A0B',
      }}
    />
  );
}
