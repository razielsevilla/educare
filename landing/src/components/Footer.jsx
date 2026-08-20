import mark from '../assets/educare-mark.png';

const Footer = () => (
    <footer>
        <div className="container footer-inner">
            <div className="footer-brand">
                <img src={mark} alt="" />
                <span>EduCare</span>
            </div>
            <span>Designed for the people who make learning feel possible.</span>
            <span>© 2026 EduCare</span>
        </div>
    </footer>
);

export default Footer;
