import Icon from './Icon.jsx';

// Words light up as you scroll (see motion layer). Pills are decorative.
export default function Sentence() {
  return (
    <section className="sentence" aria-label="What Nextohr does">
      <p className="sentence__text">
        <span className="sw">Nextohr</span> <span className="sw">tracks</span> <span className="sw">attendance</span>{' '}
        <span className="pill pill--coral" aria-hidden="true"><Icon name="solar:map-point-wave-bold" /></span><span className="sw">,</span>{' '}
        <span className="sw">approves</span> <span className="sw">leave</span>{' '}
        <span className="pill pill--ok" aria-hidden="true"><Icon name="solar:check-circle-bold" /></span><span className="sw">,</span>{' '}
        <span className="sw">runs</span> <span className="sw">payroll</span>{' '}
        <span className="pill pill--plum" aria-hidden="true">₹</span>{' '}
        <span className="sw">and</span> <span className="sw">welcomes</span> <span className="sw">new</span> <span className="sw">hires</span>{' '}
        <span className="pill pill--orchid" aria-hidden="true"><Icon name="solar:letter-opened-bold" /></span>{' '}
        <span className="sw">—</span> <span className="sw">in</span> <span className="sw">one</span> <span className="sw"><em>calm</em></span> <span className="sw">place.</span>
      </p>
    </section>
  );
}
