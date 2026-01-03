export default function HowItWorksPage() {
  return (
    <div>
      <h1>How It Works</h1>
      <p>Understanding the magic behind CSPR.AI.</p>

      <h2>The Architecture</h2>
      <p>
        CSPR.AI is built on the <strong>Model Context Protocol (MCP)</strong>, an open standard for connecting AI assistants to data and systems.
      </p>
      
      <h3>1. Natural Language Processing</h3>
      <p>
        When you type a message, it is sent to a powerful LLM (like Claude 3.5 Sonnet). 
        The model understands your intent and determines if it needs to interact with the blockchain to answer you.
      </p>

      <h3>2. Tool Execution</h3>
      <p>
        If the model needs data (e.g., "Get balance"), it calls a specific "tool" exposed by our MCP Server. 
        This server connects to the Casper Network using the official SDK.
      </p>

      <h3>3. Blockchain Interaction</h3>
      <p>
        The MCP server queries the Casper RPC nodes for the requested information. 
        It formats the raw blockchain data into a structured JSON response.
      </p>

      <h3>4. Response Generation</h3>
      <p>
        The LLM receives the data and generates a human-readable response, which is displayed to you in the chat interface.
        Frontend components render specific data types (like balances or transactions) as rich UI cards.
      </p>
    </div>
  );
}
