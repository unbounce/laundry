import * as _ from 'lodash';

import {ParametersValidator} from './parameters';
import {RootValidator} from './validators/root';
import {RefValidator} from './validators/ref';
import {TagsValidator} from './validators/tags';
import {
  ResourceTypeValidator,
  RequriedResourcePropertyValidator,
  ResourcePropertyValidator
} from './validators/resources';
import {Visitor, Walker} from './ast';
import {Error} from './types';

import * as yaml from './yaml';
import {Validator} from './validate';

export function lint(template: string) {
  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ParametersValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors),
    new RefValidator(errors),
    new TagsValidator(errors)
  ];
  const walker = new Walker(validators);
  walker.Root(yaml.load(template));
  return errors;
}
