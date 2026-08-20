import { useState } from 'react';
import { useToast } from '../context/useToast';
import mark from '../assets/educare-mark.png';

const NAV_LINKS = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'for-educators', label: 'For educators' },
    { id: 'approach', label: 'Our approach' },
];

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const showToast = useToast();

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };

    return (
        <header className="topbar">
            <div className="container topbar-inner">
                <a className="brand" href="#top">
                    <img src={mark} alt="" />
                    <span className="brand-name">EduCare</span>
                </a>
                <nav className="nav" aria-label="Primary navigation">
                    {NAV_LINKS.map((link) => (
                        <button key={link.id} type="button" onClick={() => scrollTo(link.id)}>
                            {link.label}
                        </button>
                    ))}
                </nav>
                <div className="actions">
                    <button type="button" className="quiet" onClick={() => showToast('Sign in will be available in the educator preview.')}>
                        Sign in
                    </button>
                    <button type="button" className="solid" onClick={() => showToast('The educator preview is being prepared — check back soon.')}>
                        See the preview <span>→</span>
                    </button>
                </div>
                <button
                    type="button"
                    className="mobile-menu"
                    aria-label="Toggle navigation"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    ☰
                </button>
            </div>
            <div className="mobile-nav" style={{ display: menuOpen ? 'block' : 'none' }}>
                <div className="container" style={{ padding: '20px 0', display: 'grid', gap: '16px' }}>
                    {NAV_LINKS.map((link) => (
                        <button key={link.id} type="button" className="quiet" style={{ textAlign: 'left' }} onClick={() => scrollTo(link.id)}>
                            {link.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="solid"
                        onClick={() => showToast('The educator preview is being prepared — check back soon.')}
                    >
                        See the preview →
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
