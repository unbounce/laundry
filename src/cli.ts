import * as yargs from 'yargs';
import * as fs from 'fs';

import { lint } from './index';

export function main() {
  const args = yargs
    .usage('laundry [template]')
    .command(
      'lint [template]',
      'lint a template',
      (yargs) => yargs
        .demandCommand(0, 0)
        .positional('template', {
          describe: 'template file to lint'
        })
        .help('help'),
      (argv) => {
        let template;
        try {
          template = fs.readFileSync(argv.template as string).toString();
          const errors = lint(template);
          for (const error of errors) {
            console.log(`${error.path.join('.')}: ${error.message} [${error.source}]`);
          }
          if (errors.length > 0) {
            process.exit(1);
          }
        } catch (e: any) {
          console.log(e.message);
          process.exit(1);
        }
      })
    .help('help')
    .demandCommand(1)
    .argv;
}
