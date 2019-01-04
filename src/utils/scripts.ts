import chalk from 'chalk';
import util from 'util';
import Table from 'cli-table';

export function info(msg: string, ...params: any[]) {
  console.log(chalk.cyan(util.format(msg, ...params)));
}

export function exitWithMsg(msg: string, ...params: any[]) {
  console.error(chalk.red(util.format(msg, ...params)));
  process.exit(1);
}

export const table = (keys, rows) => {
  const table = new Table({
    head: keys,
  });

  table.push(...rows.map(row => keys.map(k => row[k])));
  info(table.toString());
};

// export const printValueMap = (title, valueMap) => {
//   info(title, ...Object.keys(valueMap).map(key => chalk`${key}: {yellow ${valueMap[key]}}`));
// };

export function printVTable(valueMap) {
  const table = new Table();
  Object.keys(valueMap).forEach(key => {
    table.push({ [key]: valueMap[key] });
  });
  info(table.toString());
}
