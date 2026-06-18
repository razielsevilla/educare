import React from 'react';

const UIPreview = () => {
    return (
        <div className="ui-preview">
            <div className="ui-header">
                <div className="ui-title">Class 10 - Rizal (Watchlist)</div>
                <div className="ui-badge">42 Students</div>
            </div>

            <div className="student-row">
                <div className="student-info">
                    <div className="student-avatar" style={{ backgroundColor: 'var(--amber-glow)', color: '#d48466' }}>AM</div>
                    <div>
                        <div className="student-name">Althea Mirano</div>
                        <div className="student-meta">Grade 10 Advisory</div>
                    </div>
                </div>
                <div className="flag-indicator flag-critical">
                    <div className="status-dot"></div>
                    Critical Flag
                </div>
            </div>
            
            <div className="flag-explanation">
                <strong>System Observation:</strong> Grade trajectory dropped by 15 points across consecutive
                assessments. Structured conversation check-in recommended.
            </div>

            <div className="student-row">
                <div className="student-info">
                    <div className="student-avatar">MC</div>
                    <div>
                        <div className="student-name">Mario Cruz</div>
                        <div className="student-meta">Grade 10 Advisory</div>
                    </div>
                </div>
                <div className="flag-indicator flag-monitoring">
                    <div className="status-dot"></div>
                    Monitoring
                </div>
            </div>
        </div>
    );
};

export default UIPreview;
