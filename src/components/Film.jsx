import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Split from './Split.jsx';

export default function Film() {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => { setPlaying(true); video.current.play().catch(() => {}); };

  return (
    <section className="film" id="film" aria-labelledby="film-title">
      <div className="sec-head">
        <p className="eyebrow">The film</p>
        <Split id="film-title" className="h-lg">See it <em>in motion.</em></Split>
      </div>
      <div className={`film__frame${playing ? ' is-playing' : ''}`}>
        <video id="filmVideo" ref={video} preload="none" playsInline controls={playing} poster="/assets/media/film-poster.jpg" width="1600" height="900" onEnded={() => setPlaying(false)}>
          <source src="/assets/media/nextohr-film.mp4" type="video/mp4" />
        </video>
        <button className="film__play" type="button" aria-label="Play the Nextohr film (2 minutes 30 seconds)" onClick={play}>
          <span className="film__ring"></span><Icon name="solar:play-bold" />
        </button>
        <span className="film__len">2:30</span>
      </div>
    </section>
  );
}
