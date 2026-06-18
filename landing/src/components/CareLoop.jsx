import React from 'react';

const CareLoop = () => {
    return (
        <section id="loop" className="section-padding">
            <div className="container">
                <div className="section-header">
                    <h2>The Self-Sustaining Care Loop</h2>
                    <p>Once an underlying pattern activates an alert tier, the system guides educators through a structured
                        circle of continuous evaluation.</p>
                </div>

                <div className="loop-grid">
                    <div className="loop-card">
                        <div className="loop-number">01</div>
                        <h4>Routine Logging</h4>
                        <p>Teachers input attendance markers and score parameters using high-speed, one-tap mobile layouts.</p>
                    </div>
                    <div className="loop-card">
                        <div className="loop-number">02</div>
                        <h4>Automatic Triage</h4>
                        <p>The on-device engine processes configurations locally and presents flags alongside direct
                            plain-text logic.</p>
                    </div>
                    <div className="loop-card">
                        <div className="loop-number">03</div>
                        <h4>Guided Response</h4>
                        <p>EduCare supplies context-calibrated conversation outlines and immediate actionable pathways to
                            connect with parents or guardians.</p>
                    </div>
                    <div className="loop-card">
                        <div className="loop-number">04</div>
                        <h4>Tracked Resolution</h4>
                        <p>The system creates automated follow-ups to measure student trajectory, updating progress status
                            until safely resolved.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CareLoop;
