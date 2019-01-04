
import { Collectable } from './collectable';

export interface Player {
  name: string;
  tronium: number;
  fame: number;
  collectables: Collectable[];
  item1: Collectable;
  item2: Collectable;
  item3: Collectable;
  item4: Collectable;
}
