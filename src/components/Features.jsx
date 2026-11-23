import Icon from './Icon.jsx';
import Split from './Split.jsx';
import { Logo } from './Logo.jsx';

// Six live micro-demos. Their loops are driven by the motion layer while each card is on screen.
export default function Features() {
  return (
    <section className="features" id="features" aria-labelledby="feat-title">
      <div className="sec-head">
        <p className="eyebrow">Built for the details</p>
        <Split id="feat-title" className="h-lg">Small things, <em>done right.</em></Split>
      </div>
      <div className="bento">
        <article className="card card--cmd">
          <div className="demo cmd" aria-hidden="true">
            <div className="cmd__input"><Icon name="solar:magnifer-linear" /><span className="cmd__typed"></span><i className="cmd__caret"></i><kbd>Ctrl K</kbd></div>
            <ul className="cmd__list">
              <li className="is-hl"><Icon name="solar:wallet-money-linear" />Run payroll<span>↵</span></li>
              <li><Icon name="solar:user-plus-linear" />Add employee</li>
              <li><Icon name="solar:calendar-add-linear" />Log leave</li>
            </ul>
          </div>
          <h3>Everything is one keystroke away</h3>
          <p>Search people, jump to any screen or run any action from the command palette.</p>
        </article>

        <article className="card card--gps">
          <div className="demo gps" aria-hidden="true">
            <div className="gps__map"><span className="gps__road r1"></span><span className="gps__road r2"></span><span className="gps__fence"></span><span className="gps__pin"><Icon name="solar:map-point-bold" /></span></div>
            <div className="gps__card"><b>Checked in · 8:43 AM</b><small>Inside Noida HQ geofence</small></div>
          </div>
          <h3>Check-ins you can trust</h3>
          <p>GPS, geofence and face scan, with a trail when you need it.</p>
        </article>

        <article className="card card--pay">
          <div className="demo pay" aria-hidden="true">
            <div className="pay__row"><span>Gross</span><b data-to="62500">₹0</b></div>
            <div className="pay__row neg"><span>PF · 12%</span><b data-to="1800">₹0</b></div>
            <div className="pay__row neg"><span>ESI · 0.75%</span><b data-to="0">₹0</b></div>
            <div className="pay__row neg"><span>Prof. tax</span><b data-to="200">₹0</b></div>
            <div className="pay__row neg"><span>TDS</span><b data-to="4286">₹0</b></div>
            <div className="pay__net"><span>Net pay</span><b data-to="56214">₹0</b></div>
          </div>
          <h3>Indian payroll, already worked out</h3>
          <p>PF ceilings, ESI limits, PT slabs and LWP from attendance. Calculated, not guessed.</p>
        </article>

        <article className="card card--toast">
          <div className="demo toasts" aria-hidden="true">
            <div className="toast"><span className="chip__ic ok"><Icon name="solar:check-read-linear" /></span><div><b>Leave approved</b><small>Rasha · Sick leave · 1 day</small></div></div>
            <div className="toast"><span className="chip__ic plum"><Icon name="solar:clipboard-check-linear" /></span><div><b>12 work reports approved</b><small>Bulk-approved routine updates</small></div></div>
            <div className="toast"><span className="chip__ic coral"><Icon name="solar:letter-linear" /></span><div><b>Offer sent to Karan</b><small>Android Developer</small></div></div>
          </div>
          <h3>Approve in bulk, undo in a click</h3>
          <p>Routine requests clear in seconds, and every action can be undone.</p>
        </article>

        <article className="card card--offer">
          <div className="demo offer" aria-hidden="true">
            <div className="offer__paper">
              <Logo className="offer__logo" />
              <b className="offer__title">LETTER OF OFFER</b>
              <span className="ln" style={{ '--w': '92%' }}></span><span className="ln" style={{ '--w': '80%' }}></span><span className="ln" style={{ '--w': '88%' }}></span><span className="ln" style={{ '--w': '54%' }}></span>
              <div className="offer__ctc"><small>Annual CTC</small><b>₹8,40,000</b></div>
              <svg className="offer__sign" viewBox="0 0 200 50"><path pathLength="1" d="M6 36 C 26 6, 40 6, 44 30 S 70 46, 84 22 S 112 10, 120 30 S 160 40, 194 14" /></svg>
            </div>
          </div>
          <h3>Offer letters that write themselves</h3>
          <p>Fill in the role and salary on the left. The letter updates live on the right.</p>
        </article>

        <article className="card card--ring">
          <div className="demo ring" aria-hidden="true">
            <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" className="ring__bg" /><circle cx="60" cy="60" r="50" className="ring__fg" pathLength="100" /></svg>
            <div className="ring__label"><b className="ring__n">0%</b><small>profile complete</small></div>
          </div>
          <h3>Every person, one profile</h3>
          <p>Attendance, leave, pay, assets, goals and documents, plus a checklist for what's missing.</p>
        </article>
      </div>
    </section>
  );
}
