import Icon from './Icon.jsx';
import Split from './Split.jsx';

const TILES = [
  ['solar:shield-user-bold-duotone', 'Roles & permissions', 'A permission matrix decides who sees salaries, documents and reports.'],
  ['solar:history-bold-duotone', 'Every change on record', 'Attendance fixes and approvals keep a note of who did what and why.'],
  ['solar:document-text-bold-duotone', 'Statutory ready', 'PF, ESI, professional tax and TDS handled the way Indian payroll expects.'],
  ['solar:export-bold-duotone', 'Yours to export', 'Directories, registers and payroll runs export whenever you need them.'],
];

export default function Trust() {
  return (
    <section className="trust" aria-labelledby="trust-title">
      <div className="sec-head">
        <p className="eyebrow">Safe by design</p>
        <Split id="trust-title" className="h-lg">Your people data, <em>handled with care.</em></Split>
      </div>
      <div className="trust__grid">
        {TILES.map(([icon, title, text]) => (
          <div key={title} className="tile"><Icon name={icon} /><h3>{title}</h3><p>{text}</p></div>
        ))}
      </div>
    </section>
  );
}
