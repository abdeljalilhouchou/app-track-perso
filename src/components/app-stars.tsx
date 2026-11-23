// The app's animated background, behind every signed-in page: a soft nebula, twinkling
// stars and specks of dust rising slowly. Decorative only; it stops with reduced motion.
// Positions are fixed so the server and the phone draw the same thing.
const STARS = [
  [8, 9, 2, 0], [77, 13, 3, 1], [46, 39, 2, 2], [90, 56, 2, 0.5], [15, 66, 3, 2.6], [62, 82, 2, 1.6],
  [33, 22, 2, 3], [55, 6, 2, 1.2], [84, 34, 2, 2.2], [5, 44, 2, 0.8], [70, 62, 3, 3.4], [25, 90, 2, 1.9],
  [95, 80, 2, 2.8], [40, 70, 2, 0.3],
] as const;
const DUST = [
  [10, 3, 26, -4, "a"], [33, 2, 34, -18, "b"], [56, 4, 30, -10, "c"], [82, 2, 38, -25, "a"],
  [69, 3, 28, -2, "b"], [22, 2, 42, -31, "c"], [91, 3, 33, -14, "a"], [45, 2, 36, -22, "c"],
] as const;

export function AppStars() {
  return <div className="app-stars" aria-hidden>
    <span className="app-stars-nebula" />
    <span className="app-stars-nebula app-stars-nebula-2" />
    {STARS.map(([left, top, size, delay]) => <span key={`s${left}-${top}`} className="app-star" style={{ left: `${left}%`, top: `${top}%`, width: size + 1, height: size + 1, animationDelay: `${delay}s` }} />)}
    {DUST.map(([left, size, duration, delay, tone]) => <span key={`d${left}`} className={`app-dust app-dust-${tone}`} style={{ left: `${left}%`, width: size + 1, height: size + 1, animationDuration: `${duration}s`, animationDelay: `${delay}s` }} />)}
  </div>;
}
