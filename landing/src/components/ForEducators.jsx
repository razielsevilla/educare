import pathwaysImg from '../assets/educare-pathways.png';

const MINI_POINTS = [
    { icon: '♧', title: 'Keep context close', copy: 'Notes stay alongside the signal that prompted them.' },
    { icon: '⌁', title: 'Keep teaching moving', copy: 'The core workflow works when connectivity does not.' },
];

const ForEducators = () => (
    <section id="for-educators" className="dark-section">
        <div className="container section dark-grid">
            <div className="illustration-frame">
                <img src={pathwaysImg} alt="An illustrated learning path made from books and milestones" />
            </div>
            <div>
                <div className="kicker light-kicker">02 / For educators</div>
                <h2>Support that starts with curiosity.</h2>
                <p className="section-copy">
                    EduCare is designed for the conversations behind the numbers: the missed morning, the
                    unfinished page, the student who is suddenly less present.
                </p>
                <div className="mini-points">
                    {MINI_POINTS.map((point) => (
                        <div className="mini-point" key={point.title}>
                            <div className="icon">{point.icon}</div>
                            <div>
                                <h3>{point.title}</h3>
                                <p>{point.copy}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

export default ForEducators;
