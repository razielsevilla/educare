import { useToast } from '../context/useToast';
import heroImg from '../assets/educare-hero.png';

const Hero = () => {
    const showToast = useToast();

    return (
        <section className="container hero" id="top">
            <div>
                <div className="eyebrow"><span className="eyebrow-dot"></span>A calmer way to notice learning</div>
                <h1>Small signals.<br /><em>Better support.</em></h1>
                <p className="hero-copy">
                    EduCare helps educators turn everyday attendance, assignment, and check-in notes into a clearer
                    picture of who needs a little more support — before a small wobble becomes a roadblock.
                </p>
                <div className="hero-actions">
                    <button
                        type="button"
                        className="solid large"
                        onClick={() => showToast('The educator preview is being prepared — check back soon.')}
                    >
                        Explore EduCare →
                    </button>
                    <button
                        type="button"
                        className="underlined"
                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        See how it works⌄
                    </button>
                </div>
                <div className="checks">
                    <span><b>✓</b>Built for busy classrooms</span>
                    <span><b>✓</b>Offline-first by design</span>
                </div>
            </div>
            <div className="hero-art">
                <img src={heroImg} alt="Teacher and students learning around an open workbook" />
                <div className="annotation">
                    <small>A useful nudge</small>
                    <strong>&ldquo;Maya has gone quiet in maths this week.&rdquo;</strong>
                    <span>◉ Context before conclusions</span>
                </div>
            </div>
        </section>
    );
};

export default Hero;
