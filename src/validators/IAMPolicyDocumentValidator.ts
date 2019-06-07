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

const validatePrincipal = (path: Path, value: any, addError: ErrorFn) => {
  if (_.isPlainObject(value)) {
    const spec = {
      AWS: [validate.optional, validate.or(validate.string, listOf(validate.string))],
      Federated: [validate.optional, validate.string],
      CanonicalUser: [validate.optional, validate.string],
      Service: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    };

    if (_.isEmpty(value)) {
      addError(path, `you must provide one of ${_.join(_.keys(spec), ', ')}`);
      return false;
    } else {
      return validate.object(path, value, addError, spec);
    }
  } else {
    return validate.string(path, value, addError);
  }
};

// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
const validateStatement = (path: Path, value: any, addError: ErrorFn): boolean => {
  const spec = {
    Sid: [validate.optional, validate.string],
    Effect: [validate.required, stringOf(['Allow', 'Deny'])],
    // Principal can not be specified for inline policies
    Principal: [validate.optional, validatePrincipal],
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
        Statement: [validate.required, (path: Path, statement: any, addError: ErrorFn) => {
          if(_.isArray(statement)) {
            return listOf(validateStatement)(path, statement, addError);
          } else {
            return validateStatement(path, statement, addError);
          }
        }]
      };
      validate.object(path, value, this.addError, spec);
    }
  }

}
