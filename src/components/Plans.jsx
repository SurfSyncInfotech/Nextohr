import Icon from './Icon.jsx';
import Split from './Split.jsx';

// Crop-mark corners used on the plans block, cards, tags and buttons.
const Marks = () => (<><span className="mk tl"></span><span className="mk tr"></span><span className="mk bl"></span><span className="mk br"></span></>);

const PLANS = [
  {
    id: 'standard', tone: 'plum', tag: 'Standard',
    for: 'For growing teams that want every check-in, leave and payslip in one place.',
    items: ['GPS and face-scan attendance with a live board', 'Leave, work reports and offers in one approvals inbox', 'Payroll with PF, ESI, PT and TDS worked out', 'Hiring pipeline with live offer letters', 'Goals with weekly check-ins and at-risk alerts', "Every screen ready for employees' phones"],
  },
  {
    id: 'white-label', tone: 'coral', tag: 'White-label',
    for: 'For businesses that want the HRMS to carry their own brand.',
    items: ['Everything in Standard', 'Your logo, colours and sign-in page', 'Your company name on offer letters and payslips', 'Roles and permissions set per person', 'Multiple branches, departments and shifts'],
  },
];

export default function Plans({ onSelectPlan }) {
  return (
    <section className="plans-sec" id="plans" aria-labelledby="plans-title">
      <div className="plans-head marks">
        <Marks />
        <Split id="plans-title" className="h-lg"><span className="ring-dot" aria-hidden="true"></span>Simple plans. <em>Priced</em> on a call.</Split>
        <p className="sec-sub">Start a free trial — modules follow the plan Super Admin assigns.</p>
      </div>
      <div className="pcards">
        {PLANS.map((p) => (
          <article key={p.id} className="pcard marks" data-tone={p.tone}>
            <Marks />
            <p className="ptag marks"><Marks /><i className="ring-dot sm" aria-hidden="true"></i>{p.tag}</p>
            <h3 className="pcard__title">Talk to us</h3>
            <p className="pcard__for">{p.for}</p>
            <a href="#demo" className="pbtn marks" data-plan={p.id} onClick={() => onSelectPlan(p.id)}>
              <Marks />
              <span className="pbtn__ic"><Icon name="solar:arrow-right-linear" /></span>Start free trial
            </a>
            <hr />
            <h4>What's included</h4>
            <ul className="pcard__list">
              {p.items.map((t) => <li key={t}><Icon name="solar:check-circle-linear" />{t}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
