import Icon from './Icon.jsx';
import Split from './Split.jsx';

const QA = [
  ['How long does it take to set up?', 'Most teams are live in an afternoon. A guided checklist walks you through company details, branches, shifts, holidays and leave policies, and you can bulk-import employees from a spreadsheet.'],
  ['Does payroll handle Indian compliance?', 'Yes. PF with the wage ceiling, ESI eligibility, professional tax slabs and TDS are calculated for you. Loss of pay is pulled from attendance and leave automatically.'],
  ['Can employees use it on their phone?', 'Every screen is responsive. Employees can check in with GPS or face scan, apply for leave and submit work reports from any phone.'],
  ['Can we move our existing data in?', 'Import employees with row-by-row validation, and bring salary structures across from accepted offers. Our team helps you move it across during setup.'],
  ['How is pricing decided?', 'Plans are priced on a short call, based on your team size and the modules you need. Every plan is set up with you on a 20-minute demo, using your own team as the example.'],
];

export default function Faq() {
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq__head">
        <p className="eyebrow">FAQ</p>
        <Split id="faq-title" className="h-lg">Questions, <em>answered.</em></Split>
      </div>
      <div className="faq__list">
        {QA.map(([q, a]) => (
          <details key={q}><summary>{q}<Icon name="solar:add-circle-linear" /></summary><p>{a}</p></details>
        ))}
      </div>
    </section>
  );
}
