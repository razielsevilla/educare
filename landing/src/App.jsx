import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Reality from './components/Reality';
import CoreShift from './components/CoreShift';
import CareLoop from './components/CareLoop';
import Technical from './components/Technical';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Reality />
        <CoreShift />
        <CareLoop />
        <Technical />
        <Footer />
      </main>
    </>
  );
}

export default App;
