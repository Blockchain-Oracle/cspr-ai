export default function DocsPage() {
  return (
    <div>
      <h1>Introduction to CSPR.AI</h1>
      <p className="lead">
        CSPR.AI is an intelligent assistant for the Casper ecosystem, allowing users to interact with the blockchain using natural language.
      </p>
      
      <h2>What is CSPR.AI?</h2>
      <p>
        CSPR.AI combines the power of Large Language Models (LLMs) with the Casper blockchain through the Model Context Protocol (MCP). 
        It enables developers and users to:
      </p>
      <ul>
        <li>Check account balances and transaction history</li>
        <li>Deploy smart contracts without writing boilerplate code</li>
        <li>Analyze network statistics and validator performance</li>
        <li>Manage wallets and assets securely</li>
      </ul>

      <h2>Why use it?</h2>
      <p>
        Interacting with blockchains typically requires technical knowledge of CLI tools, SDKs, or complex web interfaces. 
        CSPR.AI simplifies this by letting you express your intent in plain English, like "Send 100 CSPR to Alice" or "Deploy an NFT contract".
      </p>

      <div className="not-prose mt-8">
        <a href="/docs/getting-started" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Get Started &rarr;
        </a>
      </div>
    </div>
  );
}
