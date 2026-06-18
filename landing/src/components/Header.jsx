import React from 'react';

const Header = () => {
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
                    <a href="#" className="btn btn-sm">Try the Prototype</a>
                </nav>
            </div>
        </header>
    );
};

export default Header;
