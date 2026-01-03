'use client';

import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/shared/Card";
import { Shield, Zap, Users, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            About CSPR.AI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The first AI-powered assistant dedicated to the Casper blockchain ecosystem,
            making blockchain interactions accessible through natural language.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card padding="lg" className="border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We're building the bridge between traditional users and blockchain technology.
              CSPR.AI eliminates the complexity of blockchain interactions by allowing users
              to manage tokens, mint NFTs, participate in DAOs, and explore the Casper network
              using simple, conversational commands.
            </p>
          </Card>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What We Do</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card padding="md" className="text-center hover:border-primary/30 transition-colors">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Token Transfers</h3>
              <p className="text-sm text-muted-foreground">
                Send native CSPR and ERC-20 tokens with simple commands
              </p>
            </Card>

            <Card padding="md" className="text-center hover:border-primary/30 transition-colors">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">NFT Operations</h3>
              <p className="text-sm text-muted-foreground">
                Mint, transfer, and manage NFTs through conversational AI
              </p>
            </Card>

            <Card padding="md" className="text-center hover:border-primary/30 transition-colors">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">DAO Participation</h3>
              <p className="text-sm text-muted-foreground">
                Vote on proposals and participate in governance seamlessly
              </p>
            </Card>

            <Card padding="md" className="text-center hover:border-primary/30 transition-colors">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Network Insights</h3>
              <p className="text-sm text-muted-foreground">
                Explore blocks, validators, and real-time network data
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built With</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="md" className="border-primary/20">
              <h3 className="font-bold mb-2">Casper Network</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade blockchain with upgradable smart contracts and
                proof-of-stake consensus.
              </p>
            </Card>

            <Card padding="md" className="border-primary/20">
              <h3 className="font-bold mb-2">Model Context Protocol</h3>
              <p className="text-sm text-muted-foreground">
                Standardized AI-blockchain integration enabling secure and
                efficient tool interactions.
              </p>
            </Card>

            <Card padding="md" className="border-primary/20">
              <h3 className="font-bold mb-2">Next.js 15</h3>
              <p className="text-sm text-muted-foreground">
                Modern React framework delivering fast, responsive user
                experiences with server-side rendering.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>

          <div className="space-y-6">
            <Card padding="md" className="border-l-4 border-l-primary">
              <h3 className="font-bold mb-2">Accessibility First</h3>
              <p className="text-muted-foreground">
                We believe blockchain should be accessible to everyone, regardless of
                technical expertise. Natural language is the future of user interfaces.
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-primary">
              <h3 className="font-bold mb-2">Security & Trust</h3>
              <p className="text-muted-foreground">
                Your private keys never leave your wallet. All transactions are signed
                locally through trusted wallet integrations like CSPR.click.
              </p>
            </Card>

            <Card padding="md" className="border-l-4 border-l-primary">
              <h3 className="font-bold mb-2">Open & Transparent</h3>
              <p className="text-muted-foreground">
                Built on open-source technologies and standards. Our tools are designed
                to be extensible and community-driven.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join the future of blockchain interaction with CSPR.AI
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/chat"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Start Chatting
            </a>
            <a
              href="/docs"
              className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Read Docs
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
