import * as _ from 'lodash';
import { Validator, ValidationFn } from '../validate';
import * as validate from '../validate';
import { Path, Error } from '../types';

const listOf = (fn: ValidationFn): ValidationFn => {
  return (path: Path, value: any, errors: Error[]) => {
    return validate.list(path, value, errors, fn);
  }
}

const validateStatement = (path: Path, value: any, errors: Error[]): boolean => {
  const spec = {
    Sid: [validate.optional, validate.string],
    Effect: [validate.required, validate.string], // One of: Allow, Deny
    Principal: [validate.required, validate.or(validate.string, listOf(validate.string))],
    Action: [validate.required, validate.or(validate.string, listOf(validate.string))],
    Resource: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    Condition: [validate.optional, validate.object],
  };
  return validate.object(path, value, errors, spec);
}

export default class IAMPolicyDocumentValidator extends Validator {

  ResourceProperty(path: Path, name: string, value: any) {
    if (name === 'PolicyDocument') {
      const spec = {
        Version: [validate.optional, validate.string],
        Statement: [validate.required, listOf(validateStatement)]
      };
      validate.object(path, value, this.errors, spec);
    }
  }

}
