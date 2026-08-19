import { useState } from 'react';

const Header = () => {
    const [showPrototypeModal, setShowPrototypeModal] = useState(false);

    return (
        <header>
            <div className="container">
                <a href="#" className="logo">
                    <div className="logo-icon">E</div>
                    <div className="logo-text">EduCare</div>
                </a>
                <nav>
                    <a href="#problem" className="nav-link">The Reality</a>
                    <a href="#solution" className="nav-link">Our Approach</a>
                    <a href="#loop" className="nav-link">The Care Loop</a>
                    <a href="#technical" className="nav-link">Offline Engine</a>
                    <button type="button" className="btn btn-sm" onClick={() => setShowPrototypeModal(true)}>
                        Try the Prototype
                    </button>
                </nav>
            </div>

            {showPrototypeModal && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onClick={() => setShowPrototypeModal(false)}
                >
                    <div
                        className="modal-box"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="prototype-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="prototype-modal-title">The prototype isn&apos;t public yet</h3>
                        <p>
                            EduCare is still under active development. We&apos;re focused on getting the
                            Discovery, Response, and Recovery workflow right before opening up a hands-on build.
                            Check back soon.
                        </p>
                        <button type="button" className="btn btn-sm" onClick={() => setShowPrototypeModal(false)}>
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
