import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { PrimitiveType, PropertyValueType } from '../spec';

export default class CfnFnsInputsValidator extends Validator {
  resourceType: any;

  Resource(path: Path, o: any) {
    if (_.isObject(o)) {
      this.resourceType = _.get(o, 'Type');
    } else {
      this.resourceType = undefined;
    }
  }

  CfnFn(path: Path, cfnFn: yaml.CfnFn) {
    if (cfnFn.paramSpec) {
      if (_.isFunction(cfnFn.paramSpec)) {
        cfnFn.paramSpec(path, this.errors);
      } else if (_.isObject(cfnFn.paramSpec)) {
        validate.spec(path, this.resourceType, cfnFn.paramSpec as PropertyValueType, cfnFn.data, this.errors);
      }
    }
  }

}
