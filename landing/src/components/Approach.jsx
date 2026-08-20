import checkinsImg from '../assets/educare-checkins.png';
import offlineImg from '../assets/educare-offline.png';

const CARDS = [
    {
        image: checkinsImg,
        alt: 'Teacher and student reviewing a progress board',
        kicker: 'Human in the loop',
        title: 'Signals open a conversation. They never close one.',
        copy: 'Teachers bring the judgment, the relationship, and the context. EduCare simply helps the right detail arrive sooner.',
    },
    {
        image: offlineImg,
        alt: 'Laptop and tablet on a classroom desk',
        kicker: 'Access by default',
        title: 'Learning should not pause when the Wi-Fi does.',
        copy: 'Capture notes and review the day in classrooms where connectivity is intermittent, shared, or simply not guaranteed.',
    },
];

const Approach = () => (
    <section id="approach" className="container section">
        <div className="approach-head">
            <div>
                <div className="kicker">03 / Our approach</div>
                <h2>A tool for care, not surveillance.</h2>
            </div>
            <p>Every feature has to earn its place by helping a real educator make a more considered decision.</p>
        </div>
        <div className="approach-cards">
            {CARDS.map((card) => (
                <article className="approach-card" key={card.title}>
                    <div className="approach-image">
                        <img src={card.image} alt={card.alt} />
                    </div>
                    <div className="approach-content">
                        <div className="kicker" style={{ color: 'var(--coral)' }}>{card.kicker}</div>
                        <h3>{card.title}</h3>
                        <p>{card.copy}</p>
                    </div>
                </article>
            ))}
        </div>
    </section>
);

export default Approach;
