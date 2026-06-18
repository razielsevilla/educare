import React from 'react';

const CoreShift = () => {
    return (
        <section id="solution" className="section-padding shift-section">
            <div className="container">
                <div className="section-header">
                    <h2>The Core Behavioral Shift</h2>
                    <p>EduCare fundamentally reframes the educator's daily data workflow—shifting their primary cognitive
                        demand so they spend energy where it counts.</p>
                </div>

                <div className="shift-box">
                    <div className="shift-side shift-left">
                        <span className="shift-label">The Old Standard</span>
                        <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>The Teacher as the Detector</h3>
                        <p style={{ fontSize: '15px', color: '#5c627a' }}>Teachers are forced to actively observe, analyze raw
                            data trends, detect subtle indicators, and remember who needs intervention—all while keeping up
                            with everyday administrative paperwork.</p>
                    </div>
                    
                    <div className="shift-divider">
                        <div className="shift-divider-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </div>
                    </div>

                    <div className="shift-side shift-right">
                        <span className="shift-label">The EduCare System</span>
                        <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>The Teacher as the Responder</h3>
                        <p style={{ fontSize: '15px', color: 'var(--chalkboard-slate)' }}>Teachers input routine numeric logs they
                            already capture—attendance, grades, and homework. The local engine tracks patterns and surfaces
                            actionable prompts. <strong>The teacher focuses entirely on human care.</strong></p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CoreShift;
