import { useToast } from '../context/useToast';

const CTA = () => {
    const showToast = useToast();

    return (
        <section className="container section" style={{ paddingBottom: '112px' }}>
            <div className="cta">
                <div className="kicker" style={{ color: 'rgba(255,250,240,.7)' }}>A thoughtful next step</div>
                <h2>Make the small signals useful.</h2>
                <p>See how EduCare could fit into the rhythm of your classroom, without adding another layer of noise.</p>
                <button
                    type="button"
                    className="solid"
                    onClick={() => showToast('The educator preview is being prepared — check back soon.')}
                >
                    Request the educator preview →
                </button>
            </div>
        </section>
    );
};

export default CTA;
