import React from 'react';
import UIPreview from './UIPreview';

const Hero = () => {
    return (
        <section className="hero">
            <div className="container">
                <div className="hero-grid">
                    <div>
                        <span className="hero-tagline">Relationship & Care Infrastructure</span>
                        <h1>Built for teachers. Designed for students. Works anywhere.</h1>
                        <p>An offline-first mobile assistant that gently transforms routine classroom check-ins into
                            structured workflows—ensuring vulnerable students are never overlooked, no matter the class
                            size.</p>
                        <div className="hero-actions">
                            <a href="#solution" className="btn">See How It Works</a>
                            <a href="#problem" className="btn btn-secondary">Read the Field Insights</a>
                        </div>
                    </div>

                    <UIPreview />
                </div>
            </div>
        </section>
    );
};

export default Hero;
