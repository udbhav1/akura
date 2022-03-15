export type Akura = {
  "version": "0.1.0",
  "name": "akura",
  "instructions": [
    {
      "name": "createFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "usdcMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": {
            "array": [
              "u8",
              30
            ]
          }
        },
        {
          "name": "symbol",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        },
        {
          "name": "numAssets",
          "type": "u8"
        },
        {
          "name": "weights",
          "type": {
            "array": [
              "u64",
              5
            ]
          }
        },
        {
          "name": "tokenDecimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setManager",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newManager",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "initBuyData",
      "accounts": [
        {
          "name": "fund",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buyData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyerUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerIndexAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initSellData",
      "accounts": [
        {
          "name": "fund",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sellData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "sellerUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerIndexAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "fund",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                30
              ]
            }
          },
          {
            "name": "symbol",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "manager",
            "type": "publicKey"
          },
          {
            "name": "numAssets",
            "type": "u8"
          },
          {
            "name": "assets",
            "type": {
              "array": [
                "publicKey",
                5
              ]
            }
          },
          {
            "name": "weights",
            "type": {
              "array": [
                "u64",
                5
              ]
            }
          },
          {
            "name": "indexTokenMint",
            "type": "publicKey"
          },
          {
            "name": "mintBump",
            "type": "u8"
          },
          {
            "name": "indexTokenSupply",
            "type": "u64"
          },
          {
            "name": "genesis",
            "type": "u64"
          },
          {
            "name": "fundBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "buyData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "supplySnapshot",
            "type": "u64"
          },
          {
            "name": "usdcRefunded",
            "type": "u64"
          },
          {
            "name": "assetIndex",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sellData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "publicKey"
          },
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "supplySnapshot",
            "type": "u64"
          },
          {
            "name": "assetIndex",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Bid"
          },
          {
            "name": "Ask"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidWeights",
      "msg": "Asset weights passed are invalid"
    },
    {
      "code": 6001,
      "name": "InvalidRemainingAccounts",
      "msg": "Remaining accounts passed are invalid."
    },
    {
      "code": 6002,
      "name": "InvalidBuyData",
      "msg": "Buy data passed is invalid."
    },
    {
      "code": 6003,
      "name": "InvalidSellData",
      "msg": "Sell data passed is invalid."
    },
    {
      "code": 6004,
      "name": "InvalidFundMint",
      "msg": "Index token mint passed is invalid."
    },
    {
      "code": 6005,
      "name": "WrongTokenMint",
      "msg": "Asset mint passed does not match next asset to buy."
    },
    {
      "code": 6006,
      "name": "InvalidFundAta",
      "msg": "Fund asset ATA passed in remaining accounts does not match asset to buy."
    }
  ]
};

export const IDL: Akura = {
  "version": "0.1.0",
  "name": "akura",
  "instructions": [
    {
      "name": "createFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "usdcMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": {
            "array": [
              "u8",
              30
            ]
          }
        },
        {
          "name": "symbol",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        },
        {
          "name": "numAssets",
          "type": "u8"
        },
        {
          "name": "weights",
          "type": {
            "array": [
              "u64",
              5
            ]
          }
        },
        {
          "name": "tokenDecimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setManager",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "manager",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newManager",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "initBuyData",
      "accounts": [
        {
          "name": "fund",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buyData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyerUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerIndexAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initSellData",
      "accounts": [
        {
          "name": "fund",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sellData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellFund",
      "accounts": [
        {
          "name": "fund",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "indexTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "sellerUsdcAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerIndexAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "fund",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                30
              ]
            }
          },
          {
            "name": "symbol",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "manager",
            "type": "publicKey"
          },
          {
            "name": "numAssets",
            "type": "u8"
          },
          {
            "name": "assets",
            "type": {
              "array": [
                "publicKey",
                5
              ]
            }
          },
          {
            "name": "weights",
            "type": {
              "array": [
                "u64",
                5
              ]
            }
          },
          {
            "name": "indexTokenMint",
            "type": "publicKey"
          },
          {
            "name": "mintBump",
            "type": "u8"
          },
          {
            "name": "indexTokenSupply",
            "type": "u64"
          },
          {
            "name": "genesis",
            "type": "u64"
          },
          {
            "name": "fundBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "buyData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "supplySnapshot",
            "type": "u64"
          },
          {
            "name": "usdcRefunded",
            "type": "u64"
          },
          {
            "name": "assetIndex",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sellData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "publicKey"
          },
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "supplySnapshot",
            "type": "u64"
          },
          {
            "name": "assetIndex",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Bid"
          },
          {
            "name": "Ask"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidWeights",
      "msg": "Asset weights passed are invalid"
    },
    {
      "code": 6001,
      "name": "InvalidRemainingAccounts",
      "msg": "Remaining accounts passed are invalid."
    },
    {
      "code": 6002,
      "name": "InvalidBuyData",
      "msg": "Buy data passed is invalid."
    },
    {
      "code": 6003,
      "name": "InvalidSellData",
      "msg": "Sell data passed is invalid."
    },
    {
      "code": 6004,
      "name": "InvalidFundMint",
      "msg": "Index token mint passed is invalid."
    },
    {
      "code": 6005,
      "name": "WrongTokenMint",
      "msg": "Asset mint passed does not match next asset to buy."
    },
    {
      "code": 6006,
      "name": "InvalidFundAta",
      "msg": "Fund asset ATA passed in remaining accounts does not match asset to buy."
    }
  ]
};
