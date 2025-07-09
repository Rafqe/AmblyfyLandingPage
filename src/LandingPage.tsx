import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://temkhtebkbcidecterqz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbWtodGVia2JjaWRlY3RlcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MzQwMDYsImV4cCI6MjA2NDUxMDAwNn0.6lK1CuirhFNRB-RVwMc-QPwirWlPUlNEbCjTPOg7B7E"
);

const NAVBAR_HEIGHT = 80;

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const y =
      el.getBoundingClientRect().top + window.pageYOffset - NAVBAR_HEIGHT;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
};

const LandingPage: React.FC = () => {
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Mobile menu toggle
  const handleMobileMenuToggle = () => setMobileMenuOpen((open) => !open);
  const handleMobileMenuLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollToSection(id), 100); // Wait for menu to close
  };
  const handleNavLinkClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection(id);
  };

  // Back to top logic
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll-triggered fade-in-up animations
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in-up");
    const observer = new window.IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.1 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Contact form handler
  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);
    setFormLoading(true);
    // Basic validation
    if (contactForm.name.length < 2) {
      setFormStatus("Name must be at least 2 characters long.");
      setFormLoading(false);
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactForm.email)) {
      setFormStatus("Please enter a valid email address.");
      setFormLoading(false);
      return;
    }
    if (contactForm.message.length < 10) {
      setFormStatus("Message must be at least 10 characters long.");
      setFormLoading(false);
      return;
    }
    try {
      const { error } = await supabase.from("messages").insert([
        {
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        setFormStatus("Error: " + error.message);
      } else {
        setFormStatus("Message sent successfully! We'll get back to you soon.");
        setContactForm({ name: "", email: "", message: "" });
      }
    } catch (err: any) {
      setFormStatus(`Failed to send message: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-6 md:px-12 fixed w-full z-50 top-0">
        <nav className="container mx-auto flex justify-between items-center">
          <a
            href="#home"
            className="text-2xl font-bold text-brand-dark-blue rounded-md p-2 hover:bg-gray-100 transition-colors"
            onClick={handleNavLinkClick("home")}
          >
            <img
              src="/assets/Amblify_logo_zilsfix.png"
              alt="Amblyfy"
              className="h-10"
            />
          </a>
          <div className="hidden md:flex space-x-6">
            <a
              href="#home"
              className="text-gray-600 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2"
              onClick={handleNavLinkClick("home")}
            >
              Home
            </a>
            <a
              href="#steps"
              className="text-gray-600 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2"
              onClick={handleNavLinkClick("steps")}
            >
              Steps
            </a>
            <a
              href="#about"
              className="text-gray-600 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2"
              onClick={handleNavLinkClick("about")}
            >
              About Us
            </a>
            <a
              href="#contact"
              className="text-gray-600 hover:text-brand-dark-blue font-medium transition-colors rounded-md px-3 py-2"
              onClick={handleNavLinkClick("contact")}
            >
              Contact
            </a>
            <a
              href="/login"
              className="text-white bg-brand-dark-blue hover:bg-brand-cyan font-bold transition-colors rounded-md px-4 py-2 ml-4 shadow-md hover:scale-105 duration-200"
            >
              Log In
            </a>
          </div>
          <button
            id="mobile-menu-button"
            className="md:hidden text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-dark-blue rounded-md p-2"
            onClick={handleMobileMenuToggle}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </nav>
        <div
          id="mobile-menu"
          className={`md:hidden bg-white py-2 mt-2 border-t border-gray-200${
            mobileMenuOpen ? "" : " hidden"
          }`}
        >
          <a
            href="#home"
            className="block px-4 py-2 text-gray-700 hover:bg-brand-pale-green hover:text-brand-dark-blue transition-colors rounded-md mx-2"
            onClick={() => handleMobileMenuLinkClick("home")}
          >
            Home
          </a>
          <a
            href="#steps"
            className="block px-4 py-2 text-gray-700 hover:bg-brand-pale-green hover:text-brand-dark-blue transition-colors rounded-md mx-2"
            onClick={() => handleMobileMenuLinkClick("steps")}
          >
            Steps
          </a>
          <a
            href="#about"
            className="block px-4 py-2 text-gray-700 hover:bg-brand-pale-green hover:text-brand-dark-blue transition-colors rounded-md mx-2"
            onClick={() => handleMobileMenuLinkClick("about")}
          >
            About Us
          </a>
          <a
            href="#contact"
            className="block px-4 py-2 text-gray-700 hover:bg-brand-pale-green hover:text-brand-dark-blue transition-colors rounded-md mx-2"
            onClick={() => handleMobileMenuLinkClick("contact")}
          >
            Contact
          </a>
          <a
            href="/login"
            className="block px-4 py-2 text-white bg-brand-dark-blue hover:bg-brand-cyan font-bold transition-colors rounded-md mx-2 mt-2 shadow-md text-center"
            onClick={() => handleMobileMenuLinkClick("login")}
          >
            Log In
          </a>
        </div>
      </header>
      {/* Main Content */}
      <main className="pt-20">
        {/* Home Section */}
        <section
          id="home"
          className="bg-gradient-to-b from-brand-dark-blue to-brand-cyan text-white py-20 px-6 md:px-12 text-center flex items-center justify-center min-h-[calc(100vh-80px)]"
        >
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 rounded-lg p-2 bg-white bg-opacity-10 shadow-lg">
              Screen Early See Clearly
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              We solve the challenges parents face when treating children with
              amblyopia, also known as "lazy eye." Our greatest mission is to
              create a comprehensive service that will make the treatment
              journey easier for parents, shorten the healing process, and
              empower families along the way.
            </p>
            <a
              href="#steps"
              className="inline-block bg-white text-brand-dark-blue font-bold py-3 px-8 rounded-full shadow-lg hover:bg-brand-light-green hover:scale-105 transition-all duration-300 ease-in-out transform"
              onClick={handleNavLinkClick("steps")}
            >
              Learn More
            </a>
          </div>
        </section>
        {/* Steps Section */}
        <section
          id="steps"
          className="py-16 px-6 md:px-12 bg-gradient-to-br from-white to-gray-100"
        >
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark-blue mb-12 fade-in-up">
              3 Steps to Great Vision
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div
                className="bg-gradient-to-b from-brand-cyan to-brand-dark-green p-8 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-dark-blue fade-in-up relative overflow-hidden hover:bg-opacity-90 hover:scale-[1.02]"
                id="testEyesContainer"
              >
                <div
                  id="snellenAnimationContainer"
                  className="snellen-container absolute inset-0"
                ></div>
                <div className="text-brand-cyan mb-4 relative z-10">
                  <img
                    src="/assets/testEyes.png"
                    alt="Test Your Eyes"
                    className="w-20 h-20 mx-auto"
                  />
                </div>
                <h3 className="text-xl text-white font-semibold mb-4 relative z-10">
                  Test Your Eyes
                </h3>
                <p className="text-white relative z-10">
                  Amblyfy offers a comprehensive eye test that can be completed
                  in just a few minutes to determine if your child might have
                  amblyopia.
                </p>
              </div>
              <div
                className="bg-gradient-to-b from-brand-dark-green to-brand-light-green p-8 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-dark-blue fade-in-up relative overflow-hidden hover:bg-opacity-90 hover:scale-[1.02]"
                id="startTreatmentContainer"
              >
                <div
                  id="startAnimationContainer"
                  className="snellen-container absolute inset-0"
                ></div>
                <div className="text-brand-cyan mb-4 relative z-10">
                  <img
                    src="/assets/start.png"
                    alt="Start Treatment"
                    className="w-20 h-20 mx-auto"
                  />
                </div>
                <h3 className="text-xl text-white font-semibold mb-4 relative z-10">
                  Start Treatment
                </h3>
                <p className="text-white relative z-10">
                  With the results of the eye tests, you can start the treatment
                  by connecting with an eye specialist. And start the journey to
                  a clear vision.
                </p>
              </div>
              <div
                className="bg-gradient-to-b from-brand-light-green to-brand-pale-green p-8 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-dark-blue fade-in-up relative overflow-hidden hover:bg-opacity-90 hover:scale-[1.02]"
                id="consistencyContainer"
              >
                <div
                  id="consistencyAnimationContainer"
                  className="snellen-container absolute inset-0"
                ></div>
                <div className="text-brand-cyan mb-4 relative z-10">
                  <img
                    src="/assets/zakis.svg"
                    alt="Consistency"
                    className="w-20 h-20 mx-auto"
                  />
                </div>
                <h3 className="text-xl text-white font-semibold mb-4 relative z-10">
                  Stay Consistent
                </h3>
                <p className="text-white relative z-10">
                  The team of Amblyfy believes the most important factor in
                  successful amblyopia treatment is consistency. That's why we
                  offer a personalized treatment plan tailored to your child's
                  needs, ensuring the best possible outcome.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* About Section */}
        <section
          id="about"
          className="py-16 px-6 md:px-12 bg-gradient-to-br from-brand-cyan to-brand-dark-green"
        >
          <div className="container mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 fade-in-up">
              <img
                src="/assets/aboutus.png"
                alt="About Amblyfy team"
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
            <div
              className="md:w-1/2 text-center md:text-left fade-in-up"
              style={{ transitionDelay: "0.1s" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-white mb-4">
                We are dedicated to developing innovative applications for the
                treatment of amblyopia. Our mission is to support children and
                their families by making the therapy journey more engaging,
                consistent, and effective. As part of this mission, we are
                creating an inspiring, child-friendly calendar designed to
                motivate daily participation and help parents and children stay
                on track—because consistency is key to successful amblyopia
                treatment.
              </p>
            </div>
          </div>
        </section>
        {/* Contact Section */}
        <section id="contact" className="py-16 px-6 md:px-12 bg-white">
          <div className="container mx-auto text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark-blue mb-8 fade-in-up">
              Get in Touch
            </h2>
            <p
              className="text-lg text-brand-dark-blue mb-8 opacity-90 fade-in-up"
              style={{ transitionDelay: "0.1s" }}
            >
              Have questions or want to learn more? Feel free to reach out to
              us!
            </p>
            <form
              id="contactForm"
              className="space-y-6 bg-white p-8 rounded-lg shadow-lg border border-brand-pale-green fade-in-up"
              style={{ transitionDelay: "0.2s" }}
              onSubmit={handleContactSubmit}
            >
              {formStatus && (
                <div
                  className={`p-4 mb-4 rounded-md ${
                    formStatus.startsWith("Message sent")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {formStatus}
                </div>
              )}
              <div>
                <label
                  htmlFor="name"
                  className="block text-left text-brand-dark-blue text-sm font-semibold mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  maxLength={100}
                  pattern="[A-Za-z\s\-']{2,100}"
                  title="Please enter a valid name (2-100 characters, letters, spaces, hyphens, and apostrophes only)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-dark-blue"
                  placeholder="Your Name"
                  required
                  value={contactForm.name}
                  onChange={handleContactChange}
                />
                <span className="text-sm text-gray-500 mt-1 block">
                  Maximum 100 characters
                </span>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-left text-brand-dark-blue text-sm font-semibold mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  maxLength={254}
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Please enter a valid email address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-dark-blue"
                  placeholder="your@example.com"
                  required
                  value={contactForm.email}
                  onChange={handleContactChange}
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-left text-brand-dark-blue text-sm font-semibold mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-dark-blue"
                  placeholder="Your Message"
                  required
                  value={contactForm.message}
                  onChange={handleContactChange}
                ></textarea>
                <span className="text-sm text-gray-500 mt-1 block">
                  Maximum 1000 characters
                </span>
              </div>
              <button
                type="submit"
                id="submitButton"
                className="w-full bg-brand-dark-blue text-white font-bold py-3 px-6 rounded-md shadow-md hover:bg-brand-cyan hover:scale-105 transition-all duration-300 ease-in-out transform"
                disabled={formLoading}
              >
                {formLoading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </section>
      </main>
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          id="back-to-top"
          className="fixed bottom-6 right-6 bg-brand-dark-blue text-white p-3 rounded-full shadow-lg hover:bg-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-dark-blue transition-all duration-300"
          onClick={handleBackToTop}
          aria-label="Back to top"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 w-full">
        <div className="w-full px-4">
          <div className="max-w-7xl mx-auto flex flex-col items-center space-y-4">
            <div className="flex space-x-6">
              {/* Social icons (SVGs) can be copied here as in index.html */}
            </div>
            <p className="text-gray-600">
              &copy; 2025 Amblyfy. All rights reserved.
            </p>
            <div className="flex space-x-4 text-sm">
              <a
                href="/"
                className="text-gray-600 hover:text-brand-dark-blue transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/"
                className="text-gray-600 hover:text-brand-dark-blue transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
