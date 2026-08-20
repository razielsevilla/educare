import { useState } from 'react';

const QUESTIONS = [
    {
        question: 'Is EduCare another grading system?',
        answer: 'No. EduCare brings existing classroom signals into a support workflow. It does not replace your gradebook or turn care into a score.',
    },
    {
        question: 'What happens when we are offline?',
        answer: 'The core capture and review experience is designed to keep working with unreliable connectivity, then sync when a connection is available.',
    },
    {
        question: 'Who is it for?',
        answer: 'EduCare is for educators and school teams who want a clearer, more human way to notice learning friction early.',
    },
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <section className="faq-band">
            <div className="container section faq-grid">
                <div>
                    <div className="kicker">Questions from the staff room</div>
                    <h2>Good tools make room for good questions.</h2>
                </div>
                <div className="faq-list">
                    {QUESTIONS.map((item, index) => (
                        <div className={`faq-item${openIndex === index ? ' open' : ''}`} key={item.question}>
                            <button
                                type="button"
                                className="faq-question"
                                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                            >
                                {item.question} <span className="chevron">⌄</span>
                            </button>
                            <div className="faq-answer">{item.answer}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
