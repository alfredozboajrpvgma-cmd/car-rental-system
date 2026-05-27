import React from 'react';
import Hero from '../components/Hero';
import WhyChooseUs from '../components/WhyChooseUs';
import HowItWorks from '../components/HowItWorks';
import Fleet from '../components/Fleet';
import Testimonials from '../components/Testimonials';
import CallToAction from '../components/CallToAction';

const Home = () => {
  return (
    <>
      <Hero />
      <WhyChooseUs />
      <HowItWorks />
      <Fleet />
      <Testimonials />
      <CallToAction />
    </>
  );
};

export default Home;
