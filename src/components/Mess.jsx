import Icon from './Icon.jsx';
import { Logo } from './Logo.jsx';

const TOOLS = [
  [-34, -26, 'logos:google-sheets'], [-40, 4, 'logos:whatsapp-icon'], [-28, 28, 'logos:google-gmail'],
  [-16, -36, 'vscode-icons:file-type-excel'], [18, -34, 'logos:google-calendar'], [34, -20, 'logos:google-drive'],
  [40, 8, 'logos:slack-icon'], [28, 30, 'solar:calculator-minimalistic-bold-duotone'], [-4, 38, 'solar:notebook-bookmark-bold-duotone'],
];
const BUBBLES = [[-22, -14, "Who's on leave Friday?", ''], [24, -6, 'Did payroll count LWP?', ' bubble--r'], [14, 20, "Where is Karan's offer letter?", '']];

export default function Mess() {
  return (
    <section className="mess" id="product" aria-labelledby="mess-title">
      <div className="mess__pin">
        <div className="mess__tools" aria-hidden="true">
          {TOOLS.map(([x, y, icon]) => (
            <span key={icon} className="tool" style={{ '--x': String(x), '--y': String(y) }}><Icon name={icon} /></span>
          ))}
          {BUBBLES.map(([x, y, text, mod]) => (
            <span key={text} className={`bubble${mod}`} style={{ '--x': String(x), '--y': String(y) }}>{text}</span>
          ))}
        </div>
        <div className="mess__core" aria-hidden="true"><Logo /></div>
        <div className="mess__copy">
          <h2 id="mess-title" className="mess__t1 h-xl">HR shouldn't live in <em>nine tabs.</em></h2>
          <p className="mess__t2 h-xl" aria-hidden="true">Now it lives in <em>one.</em></p>
        </div>
      </div>
    </section>
  );
}
