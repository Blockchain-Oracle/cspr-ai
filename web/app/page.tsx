'use client';

import { Hero } from "@/components/landing/Hero";
import { FeaturesCarousel } from "@/components/landing/FeaturesCarousel";
import { UseCases } from "@/components/landing/UseCases";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TechSpecs } from "@/components/landing/TechSpecs";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/layout/Footer";
import { Wallet, MessageSquare, Code2, Zap, Shield, Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleStartChat = () => {
    router.push('/chat');
  };

  return (
    <div className="flex flex-col gap-0 w-full">
      <Hero
        headline="Casper Blockchain"
        subheadline="Build and interact with smart contracts using natural language. The first AI-powered assistant dedicated to the Casper ecosystem."
        primaryCTA="Start Chatting"
        onPrimaryCTA={handleStartChat}
        secondaryCTA="Read Docs"
        onSecondaryCTA={() => window.open('https://docs.cspr-ai.xyz', '_blank')}
        tertiaryCTA="About Us"
        onTertiaryCTA={() => router.push('/about')}
      />
      
      <FeaturesCarousel 
        features={[
          {
            id: '1',
            title: 'Natural Language Queries',
            description: 'Ask questions about your account balance, transaction history, or network status in plain English.',
            icon: <MessageSquare className="h-6 w-6" />
          },
          {
            id: '2',
            title: 'NFT & Token Operations',
            description: 'Mint NFTs, transfer tokens, and manage your digital assets seamlessly.',
            icon: <Code2 className="h-6 w-6" />
          },
          {
            id: '3',
            title: 'Transaction Analysis',
            description: 'Get detailed insights into transactions, including gas usage and execution results.',
            icon: <Search className="h-6 w-6" />
          },
           {
            id: '4',
            title: 'Wallet Integration',
            description: 'Seamlessly connect your Casper wallet to sign and send transactions directly.',
            icon: <Wallet className="h-6 w-6" />
          },
           {
            id: '5',
            title: 'Real-time Data',
            description: 'Access live network statistics, validator performance, and block information.',
            icon: <Zap className="h-6 w-6" />
          },
        ]} 
        sectionTitle="Powerful Features"
      />
      
      <UseCases 
        useCases={[
            {
                id: '1',
                title: 'Check Balance',
                description: 'View your account balance in CSPR and USD.',
                exampleQuery: 'What is my balance?',
                icon: <Wallet className="h-6 w-6" />
            },
            {
                id: '2',
                title: 'Transfer Tokens',
                description: 'Send CSPR or ERC-20 tokens to any address.',
                exampleQuery: 'Transfer 10 CSPR to account hash-abc123...',
                icon: <Code2 className="h-6 w-6" />
            },
            {
                id: '3',
                title: 'Explore Blocks',
                description: 'Get information about the latest blocks and validators.',
                exampleQuery: 'Show me the latest block info',
                icon: <Search className="h-6 w-6" />
            }
        ]}
      />
      
      <HowItWorks 
        steps={[
            {
                number: 1,
                title: 'Connect Wallet',
                description: 'Link your Casper wallet to authorize interactions securely.',
                icon: <Wallet className="h-8 w-8" />
            },
            {
                number: 2,
                title: 'Ask a Question',
                description: 'Type your request in natural language to the AI assistant.',
                icon: <MessageSquare className="h-8 w-8" />
            },
            {
                number: 3,
                title: 'Get Results',
                description: 'View real-time blockchain data or execute transactions instantly.',
                icon: <Zap className="h-8 w-8" />
            }
        ]}
      />
      
      <TechSpecs 
         technologies={[
             { name: 'Casper Network', description: 'Enterprise-grade blockchain with upgradable contracts.', icon: <Shield className="h-6 w-6" /> },
             { name: 'Model Context Protocol', description: 'Standardized AI context exchange for tools.', icon: <Terminal className="h-6 w-6" /> },
             { name: 'Next.js 15', description: 'High-performance React framework.', icon: <Code2 className="h-6 w-6" /> }
         ]}
      />
      
      <CTA 
        headline="Ready to explore Casper?"
        description="Join thousands of developers and users interacting with the blockchain in a whole new way."
        buttonText="Get Started Now"
        onButtonClick={handleStartChat}
      />
      <Footer />
    </div>
  );
}