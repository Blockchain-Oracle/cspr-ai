export default function ArchitecturePage() {
  return (
    <div>
      <h1>System Architecture</h1>
      <p>A technical deep dive into the CSPR.AI stack.</p>

      <h2>High-Level Overview</h2>
      <p>The system consists of three main components:</p>
      <ol>
        <li><strong>Frontend Client (Next.js)</strong>: The React-based web interface.</li>
        <li><strong>MCP Server (Node.js)</strong>: The middleware handling blockchain logic.</li>
        <li><strong>Casper Network</strong>: The layer-1 blockchain.</li>
      </ol>

      <h2>Tech Stack</h2>
      <ul>
        <li><strong>Framework</strong>: Next.js 15 (App Router)</li>
        <li><strong>Styling</strong>: Tailwind CSS, Shadcn/ui</li>
        <li><strong>State Management</strong>: React Hooks (useChat, useMCPClient)</li>
        <li><strong>AI Integration</strong>: Model Context Protocol (MCP)</li>
        <li><strong>Blockchain SDK</strong>: Casper JS SDK</li>
      </ul>

      <h2>Security Model</h2>
      <p>
        <strong>Private keys never leave your device.</strong> The AI can construct unsigned transaction bytes, 
        but only your local wallet (Casper Wallet extension) can sign them. 
        The MCP server acts as a read-only bridge for most operations and a transaction builder for writes.
      </p>
    </div>
  );
}
