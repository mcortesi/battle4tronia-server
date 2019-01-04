import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';

const Events = [
  {
    address: '4d08dfe7a2f4991037aaff4b5f96a63d2fb994e9',
    topics: ['d64ab10c6838dd4dadadc83b965275ffa5c5a51ba19da55c68789f6036f40598'],
    data:
      '0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000928c9af0651632157ef27a2cf17ca72c575a4d21000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003544b410000000000000000000000000000000000000000000000000000000000',
  },
  {
    address: '4d08dfe7a2f4991037aaff4b5f96a63d2fb994e9',
    topics: [
      '190208d46c15b350f666d3c2ce906e5ec95a5a33a93b54511e56b07e16d3ea67',
      '000000000000000000000000928c9af0651632157ef27a2cf17ca72c575a4d21',
      '000000000000000000000000f367e846d55d970abab66dd0449dc6247f6022b3',
    ],
    data:
      '000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003544b410000000000000000000000000000000000000000000000000000000000',
  },
];

const ABI = fs.readJsonSync(path.join(__dirname, '../../solidity-out/TokenWrap.abi.json'));

const eventsInfo = ABI.filter(i => i.type === 'event').map(i => {
  const inputTypes = i.inputs.map(ii => ii.type);
  const nonIndexedTypes = i.inputs.filter(ii => !ii.indexed).map(ii => ii.type);
  const signature = `${i.name}(${inputTypes.join(',')})`;
  return {
    name: i.name,
    signature,
    topic0: ethers.utils.id(signature).slice(2),
    nonIndexedTypes,
    decodeData: (data: string) => ethers.utils.defaultAbiCoder.decode(nonIndexedTypes, data),
    // topic0: ethers.utils.keccak256(),
  };
});

const EventParsers = {};

eventsInfo.forEach(ei => {
  EventParsers[ei.topic0] = ei;
});

for (const e of Events) {
  const eInfo = EventParsers[e.topics[0]];
  const data = eInfo.decodeData('0x' + e.data);

  console.log(`Event: ${eInfo.name}(${data.joinp(', ')})`);
}
