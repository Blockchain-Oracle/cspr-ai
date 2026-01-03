export default function GettingStartedPage() {
  return (
    <div>
      <h1>Getting Started</h1>
      <p>Follow these steps to start using CSPR.AI today.</p>

      <h2>Prerequisites</h2>
      <ul>
        <li>A modern web browser</li>
        <li>A Casper wallet (e.g., Casper Wallet, Ledger)</li>
        <li>Some CSPR tokens (for transaction fees)</li>
      </ul>

      <h2>Step 1: Connect Your Wallet</h2>
      <p>
        Click the "Connect Wallet" button in the top right corner of the application. 
        This authorizes the application to read your account address and request signatures for transactions.
      </p>

      <h2>Step 2: Start a Conversation</h2>
      <p>
        Navigate to the <a href="/chat">Chat</a> interface. You will see a greeting message.
      </p>

      <h2>Step 3: Try Your First Query</h2>
      <p>Type one of the following commands into the chat input:</p>
      <pre><code>"What is my current balance?"</code></pre>
      <pre><code>"Show me the latest block on the network"</code></pre>
      <pre><code>"Who are the top validators?"</code></pre>

      <h2>Step 4: Execute a Transaction</h2>
      <p>
        To make a transfer, simply say:
      </p>
      <pre><code>"Send 10 CSPR to [recipient_address]"</code></pre>
      <p>
        The AI will construct the transaction for you and present a "Sign Transaction" button. 
        Clicking it will open your wallet extension for final approval.
      </p>
    </div>
  );
}
