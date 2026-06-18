import React from 'react';

const Technical = () => {
    return (
        <section id="technical" className="section-padding tech-section">
            <div className="container">
                <div className="tech-grid">
                    <div>
                        <span className="hero-tagline" style={{ color: 'var(--golden-hour)' }}>Engineering for Remote Reality</span>
                        <h2 style={{ fontSize: '32px', marginBottom: '24px' }}>Built Local-First. Zero Network Required.</h2>
                        <p style={{ color: 'var(--soft-shadow)', fontSize: '16px', marginBottom: '32px' }}>
                            Uneven connectivity across provincial municipalities shouldn't lock out school systems that need
                            support most. EduCare runs all analysis directly on-device without calling external web servers.
                        </p>

                        <div className="tech-specs">
                            <div className="spec-item">
                                <h4>Your Data, Secured Locally</h4>
                                <p>Student records stay securely encrypted on your device. We don't rely on constant cloud connections.</p>
                            </div>
                            <div className="spec-item">
                                <h4>Sync When You Can</h4>
                                <p>Work fully offline. The system automatically backs up data whenever you securely connect to Wi-Fi.</p>
                            </div>
                            <div className="spec-item">
                                <h4>Smart Term Awareness</h4>
                                <p>The system automatically adjusts its alerts based on the current school quarter and grading periods.</p>
                            </div>
                            <div className="spec-item">
                                <h4>Privacy by Design</h4>
                                <p>Built-in biometric locks and strict local storage protect sensitive student interventions.</p>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '40px',
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                        }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--golden-hour)' }}>Reliable Edge Processing</h3>
                        <p style={{ fontSize: '14px', color: 'var(--soft-shadow)', marginBottom: '24px' }}>
                            The application functions flawlessly inside city centers or remote rural hubs with completely disconnected coverage.
                        </p>

                        <div
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                padding: '20px',
                                borderRadius: '8px',
                                borderLeft: '3px solid var(--golden-hour)',
                                color: '#a5b4fc',
                                lineHeight: '1.5'
                            }}>
                            <span style={{ color: '#6366f1' }}>// Local processing logic</span><br />
                            <span style={{ color: '#c792ea' }}>IF</span> student.absences_rolling(14_days) &gt;= 3 {'{'}<br />
                            &nbsp;&nbsp;trigger_flag(tier: <span style={{ color: '#eab308' }}>MONITORING</span>);<br />
                            &nbsp;&nbsp;generate_insight(); <span style={{ color: '#6366f1' }}>// Runs entirely offline</span><br />
                            {'}'}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Technical;
