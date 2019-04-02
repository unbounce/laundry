import * as _ from 'lodash';
import { Validator, ValidationFn } from '../validate';
import * as validate from '../validate';
import { Path, ErrorFn } from '../types';

const listOf = (fn: ValidationFn): ValidationFn => {
  return (path: Path, value: any, addError: ErrorFn) => {
    return validate.list(path, value, addError, fn);
  }
}

const stringOf = (allowedValues: string[]): ValidationFn => {
  return (path: Path, value: any, addError: ErrorFn) => {
    return validate.string(path, value, addError, allowedValues);
  }
}

const validateStatement = (path: Path, value: any, addError: ErrorFn): boolean => {
  const spec = {
    Sid: [validate.optional, validate.string],
    Effect: [validate.required, stringOf(['Allow', 'Deny'])],
    // Principal can not be specified for inline policies
    Principal: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    Action: [validate.required, validate.or(validate.string, listOf(validate.string))],
    Resource: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    Condition: [validate.optional, validate.object],
  };
  return validate.object(path, value, addError, spec);
}

export default class IAMPolicyDocumentValidator extends Validator {

  ResourceProperty(path: Path, name: string, value: any) {
    if (name === 'PolicyDocument') {
      const spec = {
        Version: [validate.optional, validate.string],
        Statement: [validate.required, listOf(validateStatement)]
      };
      validate.object(path, value, this.addError, spec);
    }
  }

}
