export default function FAQPage() {
  return (
    <div>
      <h1>Frequently Asked Questions</h1>
      
      <h2>Security</h2>
      
      <h3>Is my private key safe?</h3>
      <p>
        <strong>Yes.</strong> CSPR.AI never accesses your private key. All transaction signing happens locally within your trusted wallet extension (like Casper Wallet). 
        The AI only proposes transactions for you to review and sign.
      </p>

      <h3>Can the AI steal my funds?</h3>
      <p>
        No. The AI cannot sign transactions. It can only build the transaction parameters (e.g., "send 50 CSPR to X"). 
        You must explicitly approve and sign every transaction in your wallet.
      </p>

      <h2>Usage</h2>

      <h3>What networks are supported?</h3>
      <p>
        Currently, CSPR.AI supports the Casper Mainnet and Testnet. You can switch networks in your wallet, and the application will adapt.
      </p>

      <h3>Why is the AI sometimes slow?</h3>
      <p>
        Complex queries might require the AI to make multiple calls to the blockchain (e.g., "Find the validator with the lowest fee"). 
        Fetching this data from the network takes time.
      </p>

      <h3>How do I report a bug?</h3>
      <p>
        Please open an issue on our GitHub repository or join our Discord community.
      </p>
    </div>
  );
}
