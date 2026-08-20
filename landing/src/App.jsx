import { ToastProvider } from './context/ToastProvider';
import Header from './components/Header';
import Hero from './components/Hero';
import ChapterBand from './components/ChapterBand';
import HowItWorks from './components/HowItWorks';
import ForEducators from './components/ForEducators';
import Approach from './components/Approach';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  return (
    <ToastProvider>
      <Header />
      <main>
        <Hero />
        <ChapterBand index="01" title="The learning loop" summary="Notice → Understand → Respond" />
        <HowItWorks />
        <ForEducators />
        <Approach />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </ToastProvider>
  );
}

export default App;
