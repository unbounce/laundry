import * as _ from 'lodash';

import {Path} from './types';

export function forEachWithPath<T>(
  path: Path,
  as: Array<T>,
  fn: (path: Path, a: T, i: number|string) => void)
: void {
  _.forEach(as, (a, i) => {
    fn(path.concat(i.toString()), a, i);
  });
}
