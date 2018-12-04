import * as _ from 'lodash';

import {Ref} from '../yaml';
import {toCfnFn} from '../util';

describe('toCfnFn', () => {
  test('Ref', () => {
    expect(toCfnFn({ Ref: 'abc'})).toMatchObject(new Ref('abc', 'Object'))
  });
});
