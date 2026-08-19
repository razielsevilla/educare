const CareLoop = () => {
    return (
        <section id="loop" className="section-padding">
            <div className="container">
                <div className="section-header">
                    <h2>The Three Pillars of Student Care</h2>
                    <p>EduCare manages the entire lifecycle of student intervention, so no student slips through the cracks.</p>
                </div>

                <div className="loop-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div className="loop-card">
                        <div className="loop-number">01</div>
                        <h4>Pillar 1: Discovery</h4>
                        <p>The on-device EWS engine analyzes routine data to spot <strong>velocity patterns</strong> and <strong>baseline anomalies</strong>, finding students who need help with zero added workload for the teacher.</p>
                    </div>
                    <div className="loop-card">
                        <div className="loop-number">02</div>
                        <h4>Pillar 2: Response</h4>
                        <p>EduCare suggests <strong>data-driven check-in prompts</strong> matched to whichever signal triggered the flag, so the teacher walks in with a starting point instead of a blank page. Fully personalized, historically-matched scripts are on our roadmap.</p>
                    </div>
                    <div className="loop-card">
                        <div className="loop-number">03</div>
                        <h4>Pillar 3: Recovery</h4>
                        <p>Care doesn't end abruptly. Students move into a <strong>Shadow Monitoring</strong> list so they stay visible after a flag is resolved. Automatic relapse detection and reinforcement prompts are on our roadmap.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CareLoop;
