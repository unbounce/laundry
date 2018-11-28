import * as _ from 'lodash';
import {ParametersValidator} from './parameters';
import {RootValidator} from './validators/root';
import {RefValidator} from './validators/ref';
import {CfnFnsValidator} from './validators/cfnfns';
import {
  ResourceTypeValidator,
  RequriedResourcePropertyValidator,
  ResourcePropertyValidator
} from './validators/resources';
import {Visitor, Walker} from './ast';
import {Error} from './types';

import * as yaml from './yaml';
import {Validator} from './validate';
import {toCfnFn} from './util';

function convertCfnFns(o: any): any {
  const cfnFn = toCfnFn(o);
  if(cfnFn) {
    cfnFn.data = convertCfnFns(cfnFn.data);
    return cfnFn;
  } else {
    if(_.isObject) {
      return _.mapValues(o, function(a: any) {
        if (_.isArray(a)) {
          return _.map(a, convertCfnFns);
        } else if (_.isObject(a)) {
          return convertCfnFns(a);
        } else {
          return a;
        }
      });
    }
  }
}

export function lint(template: string) {
  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ParametersValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors),
    new RefValidator(errors),
    new CfnFnsValidator(errors)
  ];
  const walker = new Walker(validators);
  const input = convertCfnFns(yaml.load(template));
  walker.Root(input);
  return errors;
}
