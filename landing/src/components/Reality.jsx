import React from 'react';

const Reality = () => {
    return (
        <section id="problem" className="section-padding">
            <div className="container">
                <div className="section-header">
                    <h2>The Invisible Burden of the Classroom</h2>
                    <p>Philippine public school educators care deeply about their classrooms, but systemic blockages isolate
                        them from delivering true, one-on-one student intervention.</p>
                </div>

                <div className="reality-grid">
                    <div className="reality-card">
                        <div className="reality-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <h3>Time Poverty</h3>
                        <p>Administrative tracking, paperwork compliance, and heavy curriculum grading consistently consume
                            more than half of a teacher's remaining energy block.</p>
                    </div>
                    
                    <div className="reality-card">
                        <div className="reality-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <h3>Unsustainable Ratios</h3>
                        <p>With standard class sizes hitting 40 to 60+ individuals per room, extending even 2 minutes of
                            individual attention daily demands a logistically impossible workload.</p>
                    </div>
                    
                    <div className="reality-card">
                        <div className="reality-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
                        </div>
                        <h3>The Memory Tax</h3>
                        <p>Without an integrated framework layer, student behavioral or attendance warnings fall between the
                            cracks—relying purely on a teacher's manual recall or intuition.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Reality;
