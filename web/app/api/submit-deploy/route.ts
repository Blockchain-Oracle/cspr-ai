import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to submit a signed deploy/transaction to the Casper network
 *
 * This endpoint:
 * 1. Receives a signed deploy/transaction JSON from the wallet
 * 2. Detects the format (Deploy vs Transaction V1)
 * 3. Submits it to the network via appropriate RPC method
 * 4. Returns the network-confirmed hash
 *
 * Casper network supports two formats:
 * - Deploy (Casper 1.5): Uses account_put_deploy with { deploy: ... }
 * - Transaction V1 (Casper 2.0): Uses account_put_transaction with { transaction: ... }
 */
export async function POST(req: NextRequest) {
  try {
    const { signedDeploy, network } = await req.json();

    if (!signedDeploy) {
      return NextResponse.json(
        { error: 'Missing signed deploy/transaction' },
        { status: 400 }
      );
    }

    // Determine RPC endpoint based on network
    const rpcUrl = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_CASPER_RPC_URL_MAINNET || 'https://node.cspr.cloud/rpc'
      : process.env.NEXT_PUBLIC_CASPER_RPC_URL_TESTNET || 'https://node.testnet.cspr.cloud/rpc';

    // Get API key for cspr.cloud RPC
    const apiKey = process.env.CSPR_CLOUD_API_KEY;

    // Detect format: Transaction V1 has Version1 wrapper, Deploy has header/payment/session directly
    const isTransactionV1 = signedDeploy?.Version1 !== undefined;
    const isDeployFormat = signedDeploy?.header && signedDeploy?.payment && signedDeploy?.session;

    console.log('[submit-deploy] Network:', network);
    console.log('[submit-deploy] RPC URL:', rpcUrl);
    console.log('[submit-deploy] Format detected:', isTransactionV1 ? 'Transaction V1' : isDeployFormat ? 'Deploy' : 'Unknown');
    console.log('[submit-deploy] Hash:', signedDeploy?.hash || signedDeploy?.Version1?.hash);
    console.log('[submit-deploy] Approvals count:', signedDeploy?.approvals?.length || signedDeploy?.Version1?.approvals?.length || 0);

    // Debug: Log full deploy structure
    if (isDeployFormat) {
      console.log('[submit-deploy] Deploy header:', JSON.stringify(signedDeploy?.header));
      console.log('[submit-deploy] Deploy payment keys:', Object.keys(signedDeploy?.payment || {}));
      console.log('[submit-deploy] Deploy session keys:', Object.keys(signedDeploy?.session || {}));
      console.log('[submit-deploy] Deploy payment:', JSON.stringify(signedDeploy?.payment));
    }

    // Choose RPC method and params based on format
    let rpcMethod: string;
    let rpcParams: object;

    if (isTransactionV1) {
      // Transaction V1 format - use account_put_transaction
      rpcMethod = 'account_put_transaction';
      rpcParams = { transaction: signedDeploy };
      console.log('[submit-deploy] Using account_put_transaction');
    } else if (isDeployFormat) {
      // Deploy format - use account_put_deploy
      rpcMethod = 'account_put_deploy';
      rpcParams = { deploy: signedDeploy };
      console.log('[submit-deploy] Using account_put_deploy');
    } else {
      // Unknown format - try wrapping as transaction
      console.log('[submit-deploy] Unknown format, attempting as transaction wrapper');
      rpcMethod = 'account_put_transaction';
      rpcParams = { transaction: { Version1: signedDeploy } };
    }

    // Submit to network
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': apiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: rpcMethod,
        params: rpcParams,
        id: 1,
      }),
    });

    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      console.error('RPC error response:', errorText);
      return NextResponse.json(
        { error: `RPC returned status ${response.status}: ${errorText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    // Parse JSON response
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse RPC response as JSON:', responseText);
      return NextResponse.json(
        { error: `Invalid JSON response from RPC: ${responseText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    // Check for RPC errors
    if (result.error) {
      console.error('RPC error details:', JSON.stringify(result.error, null, 2));
      return NextResponse.json(
        {
          error: `Network submission failed: ${result.error.message}`,
          rpcError: result.error,
          deploySubmitted: JSON.stringify(signedDeploy).substring(0, 500) + '...'
        },
        { status: 500 }
      );
    }

    // Extract hash from network response (deploy_hash for Deploy, transaction_hash for Transaction V1)
    const deployHash = result.result?.deploy_hash || result.result?.transaction_hash;
    if (!deployHash) {
      console.log('[submit-deploy] Full result:', JSON.stringify(result.result));
      return NextResponse.json(
        { error: 'Network did not return a deploy/transaction hash', result: result.result },
        { status: 500 }
      );
    }
    console.log('[submit-deploy] Success! Hash:', deployHash);

    // Generate explorer URL
    const explorerBase = network === 'mainnet'
      ? 'https://cspr.live'
      : 'https://testnet.cspr.live';
    const explorerUrl = `${explorerBase}/deploy/${deployHash}`;

    return NextResponse.json({
      success: true,
      deployHash,
      explorerUrl,
      network,
      status: 'submitted',
    });

  } catch (error) {
    console.error('Deploy submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit deploy' },
      { status: 500 }
    );
  }
}
