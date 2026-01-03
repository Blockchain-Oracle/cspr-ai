export default function ToolsPage() {
  return (
    <div>
      <h1>Tools Reference</h1>
      <p>List of available MCP tools that the AI can use.</p>

      <h2>Read Tools</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-primary">get_account_balance</h3>
          <p>Retrieves the CSPR balance for a given public key.</p>
        </div>
        <div>
          <h3 className="font-mono text-primary">get_block_info</h3>
          <p>Fetches details about a specific block (by height or hash) or the latest block.</p>
        </div>
        <div>
          <h3 className="font-mono text-primary">get_validator_info</h3>
          <p>Returns a list of current validators and their performance stats.</p>
        </div>
        <div>
          <h3 className="font-mono text-primary">get_deploy_status</h3>
          <p>Checks the execution status of a deploy hash.</p>
        </div>
      </div>

      <h2>Write Tools</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-mono text-primary">transfer_cspr</h3>
          <p>Constructs a transfer transaction between two accounts.</p>
        </div>
        <div>
          <h3 className="font-mono text-primary">delegate_stake</h3>
          <p>Builds a delegation transaction to stake CSPR with a validator.</p>
        </div>
        <div>
          <h3 className="font-mono text-primary">undelegate_stake</h3>
          <p>Builds a transaction to unstake CSPR.</p>
        </div>
      </div>
    </div>
  );
}
