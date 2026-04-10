import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const featuresRef = useRef();
  const aboutRef = useRef();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setFeaturesVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);

    return () => {
      if (featuresRef.current) observer.unobserve(featuresRef.current);
    };
  }, []);

  const scrollToSection = (ref) => {
    if (ref.current) {
      window.scrollTo({
        top: ref.current.offsetTop - 50,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">QR Attendance Pro</h1>
        <p className="hero-subtitle">Instant attendance tracking using QR codes</p>
        <div className="hero-buttons">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/login")}
          >
            Student / Teacher Login
          </button>
          <button
            className="btn btn-primary"
            onClick={() => scrollToSection(featuresRef)}
          >
            View Features
          </button>
          <button
            className="btn btn-outline"
            onClick={() => scrollToSection(aboutRef)}
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className={`features ${featuresVisible ? "visible" : ""}`}
      >
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>QR Attendance</h3>
            <p>Students mark attendance instantly using QR codes.</p>
          </div>
          <div className="feature-card">
            <h3>Real-Time Reports</h3>
            <p>Teachers can view daily and monthly attendance reports.</p>
          </div>
          <div className="feature-card">
            <h3>Secure Login</h3>
            <p>JWT-based login ensures data privacy for all users.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutRef} className="about">
        <h2>About QR Attendance Pro</h2>
        <p>
          QR Attendance Pro is designed for schools and colleges to make attendance marking
          easy, fast, and error-free. Students simply scan the QR code and teachers get
          instant reports in real time.
        </p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 QR Attendance Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
