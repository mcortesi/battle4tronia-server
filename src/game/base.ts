
export class BoostChoice {
  static ALL: BoostChoice[] = [
    new BoostChoice('Normal', 10, 1),
    new BoostChoice('Strong', 50, 1.15),
    new BoostChoice('Max', 50, 1.3),
    new BoostChoice('Epic', 100, 1.5),
  ];

  static DEFAULT = BoostChoice.ALL[0];
  static indexOf = (c: BoostChoice) => BoostChoice.ALL.indexOf(c);
  static fromIdx = (i: number) => BoostChoice.ALL[i];
  static fromBet = (bet: number) => {
    const found = BoostChoice.ALL.find(bc => bc.bet === bet);
    if (!found) {
      throw new Error('wrong bet');
    }
    return found;
  };

  private constructor(
    public readonly label: string,
    public readonly bet: number,
    public readonly damageMultiplier: number
  ) {}

  get value() {
    return this.bet;
  }
}
