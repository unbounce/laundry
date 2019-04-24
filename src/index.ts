import * as _ from 'lodash';
import CfnFnPreparer from './CfnFnPreparer';
import LaundryIgnore from './validators/LaundryIgnore';
import {IgnoredValidator} from './validators/LaundryIgnore';
import ParametersValidator from './validators/ParametersValidator';
import RootValidator from './validators/RootValidator';
import RefsValidator from './validators/RefsValidator';
import CfnFnsSupportedFnsValidator from './validators/CfnFnsSupportedFnsValidator';
import CfnFnsInputsValidator from './validators/CfnFnsInputsValidator';
import GetAttValidator from './validators/GetAttValidator';
import SubValidator from './validators/SubValidator';
import IfValidator from './validators/IfValidator';
import DependsOnValidator from './validators/DependsOnValidator'
import IAMPolicyDocumentValidator from './validators/IAMPolicyDocumentValidator';
import {
  ResourceTypeValidator,
  RequriedResourcePropertyValidator,
  ResourcePropertyValidator,
  ResourceConditionValidator,
  ResourceAtLeastOnePropertyValidator,
  ResourceExclusivePropertyValidator,
  ResourceInclusivePropertyValidator,
  ResourceOnlyOnePropertyValidator,
} from './validators/resources';
import { Walker } from './ast';
import { Error } from './types';

import * as yaml from './yaml';
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

export function ignoredErrorMatcher(ignoredValidators: IgnoredValidator[]): (error: Error) => boolean {
  if (_.isEmpty(ignoredValidators)) {
    return () => false;
  }

  const res: [RegExp, string][] = _.map(ignoredValidators, (v) => {
    return [
      new RegExp('^' + v.path.join('\.').replace('*', '.+') + '$'),
      v.source
    ] as [RegExp, string];
  });


  return (error) => {
    const errorPath = error.path.join('.');
    return _.some(res, ([path, source]) => error.source == source && path.test(errorPath));
  };
}

function ignoreErrors(ignoredValidators: IgnoredValidator[], errors: Error[]): Error[] {
  const isIgnored = ignoredErrorMatcher(ignoredValidators);
  return _.filter(errors, (error) => !isIgnored(error));
}

export function lint(template: string, parameters: object = {}) {
  const input = convertCfnFns(yaml.load(template));
  const ignoredValidators: IgnoredValidator[] = [];

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
    new DependsOnValidator(errors),
    new ResourceAtLeastOnePropertyValidator(errors),
    new ResourceExclusivePropertyValidator(errors),
    new ResourceInclusivePropertyValidator(errors),
    new ResourceOnlyOnePropertyValidator(errors),
    new IAMPolicyDocumentValidator(errors),
    new LaundryIgnore(ignoredValidators, errors),
  ];
  const validate = new Walker(validators);
  validate.Root(input);

  return ignoreErrors(ignoredValidators, errors);
}
