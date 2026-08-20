import { useToast } from '../context/useToast';

const STEPS = [
    { number: '01', icon: '⌖', title: 'Notice', copy: 'Bring attendance, assignment, and check-in signals into one calm view.' },
    { number: '02', icon: '▣', title: 'Understand', copy: 'Add the context only a teacher can see — no black-box labels.' },
    { number: '03', icon: '✦', title: 'Respond', copy: 'Choose a small, human next step and make a note for later.' },
];

const HowItWorks = () => {
    const showToast = useToast();

    return (
        <section id="how-it-works" className="container section">
            <div className="workflow">
                <div>
                    <div className="kicker">A workflow that respects the work</div>
                    <h2>From scattered notes to a next step.</h2>
                    <p className="section-copy">
                        The goal is not another dashboard. It is a more useful moment in the day: knowing what to
                        look at, why it matters, and what you can try next.
                    </p>
                    <button
                        type="button"
                        className="underlined"
                        onClick={() => showToast('The educator workflow preview is being prepared.')}
                    >
                        Meet the workflow →
                    </button>
                </div>
                <div className="cards">
                    <div className="path"></div>
                    {STEPS.map((step) => (
                        <article className="feature" key={step.number}>
                            <span className="feature-number">{step.number}</span>
                            <div className="feature-icon">{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.copy}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
