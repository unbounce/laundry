import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';

export default class ConditionsValidator extends Validator {

  conditions: string[] = [];

  Conditions(path: Path, conditions: any) {
    if (_.isObject(conditions)) {
      _.forEach(conditions, (condition, name) => {
        this.conditions.push(name);
      });
    }
  }

  CfnFn(path: Path, propertyName: string, value: yaml.CfnFn) {
    if (value instanceof yaml.Condition && _.isString(value.data)) {
      if (!_.includes(this.conditions, value.data)) {
        this.errors.push({
          path,
          message: `${value.data} is not a valid Condition`
        });
      }
    }
  }
}
