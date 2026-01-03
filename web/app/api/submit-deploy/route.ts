import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to submit a signed deploy to the Casper network
 *
 * This endpoint:
 * 1. Receives a signed deploy JSON from the wallet
 * 2. Submits it to the network via RPC
 * 3. Returns the network-confirmed deploy hash
 */
export async function POST(req: NextRequest) {
  try {
    const { signedDeploy, network } = await req.json();

    if (!signedDeploy) {
      return NextResponse.json(
        { error: 'Missing signed deploy' },
        { status: 400 }
      );
    }

    // Determine RPC endpoint based on network
    const rpcUrl = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_CASPER_RPC_URL_MAINNET || 'https://node.cspr.cloud/rpc'
      : process.env.NEXT_PUBLIC_CASPER_RPC_URL_TESTNET || 'https://node.testnet.cspr.cloud/rpc';

    // Get API key for cspr.cloud RPC
    const apiKey = process.env.CSPR_CLOUD_API_KEY;

    // Submit deploy via RPC account_put_deploy method
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': apiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'account_put_deploy',
        params: {
          deploy: signedDeploy,
        },
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
      return NextResponse.json(
        { error: `Network submission failed: ${result.error.message}` },
        { status: 500 }
      );
    }

    // Extract deploy hash from network response
    const deployHash = result.result?.deploy_hash;
    if (!deployHash) {
      return NextResponse.json(
        { error: 'Network did not return a deploy hash' },
        { status: 500 }
      );
    }

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
