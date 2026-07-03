import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { entryPoint07Address } from 'viem/account-abstraction';

const RPC_URL = process.env.EXPO_PUBLIC_AMOY_RPC_URL!;
const BUNDLER_URL = process.env.EXPO_PUBLIC_BUNDLER_URL!;
const PAYMASTER_URL = process.env.EXPO_PUBLIC_PAYMASTER_URL!;

const entryPoint = {
  address: entryPoint07Address,
  version: '0.7' as const,
};

export async function getSmartAccountClient(privateKey: string) {
  const signer = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const paymasterClient = createZeroDevPaymasterClient({
    chain: polygonAmoy,
    transport: http(PAYMASTER_URL),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain: polygonAmoy,
    bundlerTransport: http(BUNDLER_URL),
    paymaster: paymasterClient,
  });

  return { kernelClient, address: account.address as string };
}
