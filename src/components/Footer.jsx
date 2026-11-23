import { Logo } from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot__top">
        <div className="foot__brand">
          <Logo aria-label="Nextohr" role="img" />
          <p>HR that flows.</p>
        </div>
        <div className="foot__cols">
          <div><h4>Product</h4><a href="#tour">Attendance</a><a href="#tour">Leave</a><a href="#tour">Payroll</a><a href="#tour">Hiring</a><a href="#tour">Goals</a></div>
          <div><h4>Company</h4><a href="#">About</a><a href="#">Careers</a><a href="#">Contact</a></div>
          <div><h4>Legal</h4><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a></div>
        </div>
      </div>
      <div className="foot__mark" aria-hidden="true"><Logo /></div>
      <div className="foot__bot"><span>Copyright © Surfsync Infotech</span><span>Powered by Surfsync Infotech</span></div>
    </footer>
  );
}
