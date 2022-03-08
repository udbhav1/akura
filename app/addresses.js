import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { Keypair, PublicKey } from "@solana/web3.js";

export const marketMaker = {
    keypair: Keypair.fromSecretKey(
                Uint8Array.from(
                    [197, 56, 189, 170, 154, 94, 219, 88, 69, 24, 124, 108, 229, 245, 168, 65, 229, 31, 185, 44, 107, 186, 193, 53, 169, 52, 157, 209, 168, 223, 182, 17, 135, 255, 194, 225, 39, 188, 186, 45, 157, 100, 18, 77, 174, 6, 50, 130, 210, 157, 139, 12, 22, 179, 2, 66, 140, 38, 40, 246, 21, 142, 10, 108]
                )
            ),
    publicKey: new PublicKey("A9tEg37wCYSH5vKhAYDq5Cpfy28JzcaFeF5Nv39bNZ7h"),
    usdc: new PublicKey("4VEdqETSboLLTMpPD3ZtgNMFE2UACggHRMZMkHYTtadW"),
    mngo: new PublicKey("9xmTcoXwyCmQfKERhyBz6ykaaCvMqTSJpm1jg38ikJcw"),
    ray: new PublicKey("6zahbgqRYzr4xC4V1v3AP1oYLA1hedWWUY8qepRD6ZDi"),
}

export const mintOwner = Keypair.fromSecretKey(
    Uint8Array.from(
        [19, 252, 71, 230, 31, 221, 96, 103, 71, 30, 52, 26, 159, 224, 82, 20, 22, 97, 233, 230, 75, 5, 61, 140, 9, 238, 61, 14, 212, 13, 133, 97, 137, 4, 249, 84, 84, 104, 244, 6, 246, 175, 3, 134, 65, 217, 141, 85, 11, 213, 189, 78, 224, 101, 73, 198, 185, 184, 61, 11, 1, 161, 219, 93]
    )
);

export const USDC_MINT = new PublicKey("2G1nuuiNpekis8d3Ht8hy2mhVfNE6LuynqAxhFJMQpQh");
export const MNGO_MINT = new PublicKey("85LJaaL7PuZck2wof7yuofUheCZ6k4vwngtgRyM4vFTJ");
export const RAY_MINT = new PublicKey("9EaYTNgkyD8rWrgnUERBkwojLgPYjvPWZuyVxKevvuT");

export const MARKET_MNGO_USDC = new PublicKey("HU9EZj88bto7iiw28hTXmHfLYRscP2wAZjZCqSfgVfU7");
export const MARKET_RAY_USDC = new PublicKey("brFSGAK7tNxDj6sLyvDNJtVF8pGb6UNFap56ywvoR8U");
