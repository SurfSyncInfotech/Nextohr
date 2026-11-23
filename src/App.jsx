import { useEffect, useState } from 'react';
import { initLanding } from './motion/initLanding.js';
import { LogoDefs } from './components/Logo.jsx';
import Intro from './components/Intro.jsx';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Mess from './components/Mess.jsx';
import Sentence from './components/Sentence.jsx';
import Tour from './components/Tour.jsx';
import Features from './components/Features.jsx';
import Film from './components/Film.jsx';
import Numbers from './components/Numbers.jsx';
import MobileShowcase from './components/MobileShowcase.jsx';
import Trust from './components/Trust.jsx';
import Plans from './components/Plans.jsx';
import Faq from './components/Faq.jsx';
import DemoForm from './components/DemoForm.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  // The pre-paint script in index.html decides whether the intro plays.
  const [showIntro, setShowIntro] = useState(() => document.documentElement.classList.contains('intro-on'));
  // Plan chosen on a plan card pre-selects it in the demo form.
  const [plan, setPlan] = useState('standard');

  useEffect(() => initLanding({ onIntroDone: () => setShowIntro(false) }), []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {showIntro && <Intro />}
      <Nav />
      <LogoDefs />
      <main id="main">
        <Hero />
        <Mess />
        <Sentence />
        <Tour />
        <Features />
        <Film />
        <Numbers />
        <MobileShowcase />
        <Trust />
        <Plans onSelectPlan={setPlan} />
        <Faq />
        <DemoForm plan={plan} setPlan={setPlan} />
      </main>
      <Footer />
    </>
  );
}
