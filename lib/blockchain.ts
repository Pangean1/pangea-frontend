import {
  createPublicClient,
  http,
  parseUnits,
  type Address,
  type Hash,
} from 'viem';
import { polygonAmoy } from 'viem/chains';
import { getWalletPrivateKey } from './auth';
import { getSmartAccountClient } from './zerodev';
import { fundWalletIfNeeded, waitForDonationIndexed } from './api';

const RPC_URL = process.env.EXPO_PUBLIC_AMOY_RPC_URL!;
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS as Address;
const USDC_ADDRESS = process.env.EXPO_PUBLIC_USDC_ADDRESS as Address;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const PANGEA_ABI = [
  {
    name: 'donate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [],
  },
] as const;

export type DonationStatus =
  | 'checking'
  | 'approving'
  | 'waiting_approve'
  | 'donating'
  | 'confirming'
  | 'syncing'
  | 'done';

export async function executeDonation(
  campaignOnChainId: number,
  amountUsdc: number,
  message: string,
  onStatus: (status: DonationStatus) => void
): Promise<Hash> {
  const privateKey = await getWalletPrivateKey();
  if (!privateKey) throw new Error('No wallet found. Please sign out and sign in again.');

  const { kernelClient, address: smartAccountAddress } = await getSmartAccountClient(privateKey);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });

  const amountWei = parseUnits(amountUsdc.toFixed(6), 6);

  onStatus('checking');
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [smartAccountAddress as Address],
  });
  if (balance < amountWei) {
    // Testnet-only: silently top up the wallet with mock USDC so new donor
    // accounts can donate without a manual mint. No-op in production.
    await fundWalletIfNeeded();
  }

  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [smartAccountAddress as Address, CONTRACT_ADDRESS],
  });

  onStatus('donating');

  // Batch approve + donate into one UserOperation when approval is needed.
  // This also handles first-time account deployment in the same operation.
  const calls: any[] = [];
  if (allowance < amountWei) {
    calls.push({
      to: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, amountWei],
    });
  }
  calls.push({
    to: CONTRACT_ADDRESS,
    abi: PANGEA_ABI,
    functionName: 'donate',
    args: [BigInt(campaignOnChainId), USDC_ADDRESS, amountWei, message],
  });

  const userOpHash = await kernelClient.sendUserOperation({ calls });

  onStatus('confirming');
  const receipt = await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
    timeout: 300_000,
  });
  const txHash = receipt.receipt.transactionHash;

  onStatus('syncing');
  await waitForDonationIndexed(txHash);

  onStatus('done');
  return txHash;
}

export function getExplorerUrl(txHash: string): string {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

export async function getWalletAddress(): Promise<string | null> {
  const privateKey = await getWalletPrivateKey();
  if (!privateKey) return null;
  const { address } = await getSmartAccountClient(privateKey);
  return address;
}
