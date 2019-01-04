import { Bet } from '../model/bet';
import { BoostChoice } from './base';


// function nearMissBuilder(): SlotSymbol[] {
//   const win = genArray(ReelSize.columns, () => SlotSymbol.AttackA);
//   win[win.length - 1] = SlotSymbol.AttackC;
//   return win;
// }

export class Move {
  static ALL: Array<{ max: number; result: Move }> = [];

  static fromDice(diceResult: number): Move {
    const result = Move.ALL.find(x => x.max > diceResult);
    if (result == null) {
      throw new Error('Logic Error: cant find result for ' + diceResult);
    }
    return result.result;
  }

  static createAll(table: Array<[string, number, number, number, number]>) {
    if (Move.ALL.length > 0) {
      throw new Error('Moves Already created!');
    }

    for (const moveArgs of table) {
      const move = new Move(...moveArgs);
      Move.add(move);
    }

    const max = Move.ALL[Move.ALL.length - 1].max;
    const epsilon = 0.0001;
    if (max > 1 + epsilon || max < 1 - epsilon) {
      throw new Error(`Bad RowCombination probabilities. Sum not 1. They sum: ${max}`);
    }
    Move.ALL[Move.ALL.length - 1].max = 1;
  }
  private static add(s: Move) {
    if (Move.ALL.length === 0) {
      Move.ALL.push({ max: s.probability, result: s });
    } else {
      const prevMax = Move.ALL[Move.ALL.length - 1].max;
      Move.ALL.push({ max: s.probability + prevMax, result: s });
    }
  }

  private constructor(
    readonly id: string,
    readonly probability: number,
    readonly payout: number,
    readonly damage: number,
    readonly epicness: number
  ) {}

  isWin() {
    return this.damage + this.payout > 0;
  }

  winnings(): Winnings {
    return {
      payout: this.payout,
      damage: this.damage,
      epicness: this.epicness,
    };
  }

  toString() {
    return this.id;
  }
}

export interface Winnings {
  payout: number;
  damage: number;
  epicness: number;
}

export function winningsFor(bet: Bet, combinations: Move[]) {
  const damageMultiplier = BoostChoice.fromBet(bet.tronium).damageMultiplier;
  const baseWinnings = combinations.reduce(
    (acc, c) => {
      acc.payout += c.payout;
      acc.damage += c.damage;
      acc.epicness += c.epicness;
      return acc;
    },
    {
      payout: 0,
      damage: 0,
      epicness: 0,
    }
  );

  return {
    payout: baseWinnings.payout * bet.tronium * bet.level,
    damage: baseWinnings.damage * damageMultiplier,
    epicness: baseWinnings.epicness * damageMultiplier,
  };
}

// prettier-ignore
const MovesTable: Array<[string, number, number, number, number]> = [
  // ID          PROB    PAYOUT DAMAGE EPICNESS   MOVE GENERATOR
  ['1S4*'	      , 0.0015 , 30	  , 45   , 3333   ],
  ['3A2T'	      , 0.0600 , 0.5  , 4	   , 83     ],
  ['3B2T'	      , 0.0500 , 0.7  , 7    , 100    ],
  ['3C2T'	      , 0.0400 , 1.2  , 14   , 125    ],
  ['3D2T'	      , 0.0080 , 7.7  , 29   , 625    ],
  ['4A1T'	      , 0.0312 , 1	  , 5    , 160    ],
  ['4B1T'	      , 0.0260 , 1.4  , 9	   , 192    ],
  ['4C1T'	      , 0.0208 , 2.4  , 19	 , 240    ],
  ['4D1T'	      , 0.0042 , 15.4	, 38	 , 1202   ],
  ['5A'	        , 0.0150 , 2.5	, 6	   , 333    ],
  ['5B'	        , 0.0125 , 3.5	, 12.5 , 400    ],
  ['5C'	        , 0.0100 , 18	  , 25	 , 500    ],
  ['5D'	        , 0.0020 , 50	  , 50	 , 2500   ],
  ['3A2B'	      , 0.0080 , 0.9	, 9	   , 625    ],
  ['3A2C'	      , 0.0072 , 1.1	, 15	 , 694    ],
  ['3A2D'	      , 0.0065 , 4.4	, 26	 , 772    ],
  ['3B2A'	      , 0.0067 , 1	  , 10	 , 750    ],
  ['3B2C'	      , 0.0060 , 1.3	, 18	 , 833    ],
  ['3B2D'	      , 0.0054 , 4.6	, 29	 , 926    ],
  ['3C2A'	      , 0.0053 , 1.5	, 17	 , 938    ],
  ['3C2B'	      , 0.0048 , 1.6	, 19	 , 1042   ],
  ['3C2D'	      , 0.0043 , 5.1	, 36	 , 1157   ],
  ['3D2A'	      , 0.0011 , 8	  , 32	 , 4688   ],
  ['3D2B'	      , 0.0010 , 8.1	, 34	 , 5208   ],
  ['3D2C'	      , 0.0009 , 8.3	, 40	 , 5787   ],
  ['3ABCD1SN1T'	, 0.1000 , 0	  , 0	   , 1000   ],
  ['4ABCD1SN'	  , 0.0500 , 0	  , 0	   , 1500   ],
  ['2ABCD3T'	  , 0.1000 , 0	  , 0	   , 0      ],
  ['1ABCD4T'	  , 0.1000 , 0	  , 0	   , 0      ],
  ['2ABCD1NP2T'	, 0.0500 , 0	  , 0	   , 0      ],
  ['2ABCD2NP1T'	, 0.0500 , 0	  , 0	   , 0      ],
  ['5T'	        , 0.2116 , 0	  , 0	   , 0      ],
];

Move.createAll(MovesTable);
