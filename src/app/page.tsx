"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Recycle,
  Trophy,
  Gift,
  BarChart3,
  Shield,
  Zap,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useEffect, useState } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const features = [
  {
    icon: Recycle,
    title: "Smart Bottle Collection",
    description:
      "IoT-enabled vending machines detect, validate, and process plastic bottles automatically.",
  },
  {
    icon: Trophy,
    title: "Reward Points System",
    description:
      "Earn points for every bottle recycled. Climb the leaderboard and unlock achievements.",
  },
  {
    icon: Gift,
    title: "Redeemable Rewards",
    description:
      "Exchange points for coffee vouchers, merchandise, gift cards, and university credits.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Comprehensive dashboards track recycling trends, machine status, and environmental impact.",
  },
  {
    icon: Shield,
    title: "Secure & Role-Based",
    description:
      "Enterprise-grade authentication with admin, staff, and student role permissions.",
  },
  {
    icon: Zap,
    title: "Future-Ready Hardware",
    description:
      "Built for NFC, Arduino, ESP32, and sensor integration with modular hardware interfaces.",
  },
];

const steps = [
  { step: "01", title: "Register", desc: "Sign up with your university Student ID" },
  { step: "02", title: "Recycle", desc: "Insert plastic bottles at any FilCycle machine" },
  { step: "03", title: "Earn", desc: "Collect reward points for every valid bottle" },
  { step: "04", title: "Redeem", desc: "Claim rewards from our exclusive catalog" },
];

const faqs = [
  {
    q: "How do I earn reward points?",
    a: "Insert valid PET plastic bottles into any FilCycle machine on the FCU campus. Each accepted bottle earns 10 reward points automatically.",
  },
  {
    q: "What rewards can I redeem?",
    a: "Our catalog includes coffee vouchers, university merchandise, gift cards, cash rewards, and university credit points.",
  },
  {
    q: "How does bottle validation work?",
    a: "Machines use IR sensors, load cells, ultrasonic sensors, and material detection to verify bottle authenticity and weight.",
  },
  {
    q: "Will NFC card support be available?",
    a: "Yes! NFC student ID integration is planned. The system already includes hardware interfaces ready for NFC reader connection.",
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState({
    totalBottles: 12500,
    totalStudents: 850,
    plasticSavedKg: 312.5,
    machinesDeployed: 4,
  });

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              FAQ
            </a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(126,217,87,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
            >
              <Recycle size={14} />
              Smart Campus Recycling at Filamer Christian University
            </motion.div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Recycle Smart.
              <br />
              <span className="gradient-text">Earn Rewards.</span>
              <br />
              Protect Tomorrow.
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              FilCycle transforms plastic bottle recycling into a rewarding experience.
              Insert bottles, earn points, claim rewards — all while saving the planet.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Start Recycling <ChevronRight size={18} />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: "Bottles Recycled", value: stats.totalBottles, suffix: "+" },
              { label: "Active Students", value: stats.totalStudents, suffix: "+" },
              { label: "Plastic Saved (kg)", value: stats.plasticSavedKg, suffix: "" },
              { label: "Machines Deployed", value: stats.machinesDeployed, suffix: "" },
            ].map((stat) => (
              <Card key={stat.label} className="card-hover glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Everything You Need to <span className="gradient-text">Recycle Smarter</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              A complete recycling ecosystem designed for Filamer Christian University, powered by IoT and gamification.
            </p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="card-hover h-full border-border/50">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <feature.icon className="text-primary" size={24} />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-card/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps to start earning rewards</p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-card/30 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Get In Touch</h2>
              <p className="mb-8 text-muted-foreground">
                Have questions about FilCycle? We&apos;d love to hear from you.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail size={18} className="text-primary" />
                  contact@filamer.edu.ph
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone size={18} className="text-primary" />
                  +63 (2) 8888-9999
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin size={18} className="text-primary" />
                  Filamer Christian University, Roxas City, Capiz
                </div>
              </div>
            </motion.div>
            <Card className="glass">
              <CardContent className="p-6">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      placeholder="First Name"
                      className="h-11 rounded-xl border border-border/50 bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                      placeholder="Last Name"
                      className="h-11 rounded-xl border border-border/50 bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    placeholder="Email Address"
                    type="email"
                    className="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <textarea
                    placeholder="Your Message"
                    rows={4}
                    className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button type="submit" className="w-full">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FilCycle. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
