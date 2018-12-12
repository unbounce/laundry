import * as _ from 'lodash';
import CfnFnPreparer from './CfnFnPreparer';
import ParametersValidator from './validators/ParametersValidator';
import RootValidator from './validators/RootValidator';
import RefsValidator from './validators/RefsValidator';
import CfnFnsSupportedFnsValidator from './validators/CfnFnsSupportedFnsValidator';
import CfnFnsInputsValidator from './validators/CfnFnsInputsValidator';
import GetAttValidator from './validators/GetAttValidator';
import SubValidator from './validators/SubValidator';
import IfValidator from './validators/IfValidator';
import {
  ResourceTypeValidator,
  RequriedResourcePropertyValidator,
  ResourcePropertyValidator,
  ResourceConditionValidator,
} from './validators/resources';
import { Visitor, Walker } from './ast';
import { Error } from './types';

import * as yaml from './yaml';
import { Validator } from './validate';
import { toCfnFn } from './util';

// Convert `{ Ref: '...' }` etc to `new Ref(...)`
function convertCfnFns(o: any): any {
  const cfnFn = toCfnFn(o);
  if (cfnFn) {
    cfnFn.data = convertCfnFns(cfnFn.data);
    return cfnFn;
  } else if (_.isArray(o)) {
    return _.map(o, convertCfnFns);
  } else if (_.isObject(o)) {
    return _.mapValues(o, (a: any) => {
      if (_.isArray(a)) {
        return _.map(a, convertCfnFns);
      } else if (_.isObject(a)) {
        return convertCfnFns(a);
      } else {
        return a;
      }
    });
  } else {
    return o;
  }
}

export function lint(template: string, parameters: object = {}) {
  const input = convertCfnFns(yaml.load(template));

  const prewalk = new Walker([new CfnFnPreparer(parameters)]);
  // Mutates input
  prewalk.Root(input);

  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ParametersValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors),
    new ResourceConditionValidator(errors),
    new RefsValidator(errors),
    new CfnFnsSupportedFnsValidator(errors),
    new CfnFnsInputsValidator(errors),
    new GetAttValidator(errors),
    new SubValidator(errors),
    new IfValidator(errors),
  ];
  const validate = new Walker(validators);
  validate.Root(input);
  return errors;
}
