import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';
import { valueToSpecs } from '../util';

export default class IfValidator extends Validator {

  CfnFn(path: Path, propertyName: string, value: yaml.CfnFn) {
    if (value instanceof yaml.If && _.isArray(value.data) && value.data.length === 3) {
      const a = valueToSpecs(value.data[1]);
      const b = valueToSpecs(value.data[2]);
      if (a !== null && b !== null) {
        // Values can have multiple types (eg. `[{PrimitiveType: 'String'},
        // {PrimitiveType: 'Number'}]`) based on what we're able to infer about
        // the data. If types of `a` and `b` have no overlap in their types,
        // that is an issue.
        if (_.isEmpty(_.intersectionWith(a, b, _.isEqual))) {
          this.errors.push({ path, message: 'branches contain different data types' });
        }
      }
    }
  }

}
