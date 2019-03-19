import * as _ from 'lodash';
import { Validator, ValidationFn } from '../validate';
import * as validate from '../validate';
import { Path, Error } from '../types';
import { withSuggestion } from '../util';

const listOf = (fn: ValidationFn): ValidationFn => {
  return (path: Path, value: any, errors: Error[]) => {
    return validate.list(path, value, errors, fn);
  }
}

const stringOf = (allowedValues: string[]): ValidationFn => {
  return (path: Path, value: any, errors: Error[]) => {
    return validate.string(path, value, errors, allowedValues);
  }
}

// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
const operators = [
  'StringEquals',
  'StringNotEquals',
  'StringEqualsIgnoreCase',
  'StringNotEqualsIgnoreCase',
  'StringLike',
  'StringNotLike',
  'NumericEquals',
  'NumericNotEquals',
  'NumericLessThan',
  'NumericLessThanEquals',
  'NumericGreaterThan',
  'NumericGreaterThanEquals',
  'DateEquals',
  'DateNotEquals',
  'DateLessThan',
  'DateLessThanEquals',
  'DateGreaterThan',
  'DateGreaterThanEquals',
  'Bool',
  'Null',
  'BinaryEquals',
  'IpAddress',
  'NotIpAddress',
  'ArnEquals',
  'ArnLike',
  'ArnNotEquals',
  'ArnNotLike',
];

// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
const conditionKeys = [
  'aws:CurrentTime',
  'aws:EpochTime',
  'aws:MultiFactorAuthAge',
  'aws:MultiFactorAuthPresent',
  'aws:SecureTransport',
  'aws:UserAgent',
  'aws:PrincipalOrgID',
  /^aws:PrincipalTag\//,
  'aws:PrincipalType',
  'aws:Referer',
  'aws:RequestedRegion',
  /^aws:RequestTag\//,
  'aws:SourceAccount',
  'aws:SourceArn',
  'aws:SourceIp',
  'aws:SourceVpc',
  'aws:SourceVpce',
  'aws:TagKeys',
  'aws:TokenIssueTime',
  'aws:userid',
  'aws:username',
  /^s3:/,
];

const validateCondition = (path: Path, condition: any, errors: Error[]): boolean => {
  if (validate.object(path, condition, errors)) {
    _.forEach(condition, (value, key) => {
      path = path.concat(key);
      if (!_.includes(operators, key.toString())) {
        const message = withSuggestion(
          `key must be one of ${operators.join(', ')}, got ${key}`,
          operators,
          key
        );
        errors.push({ path, message });
      }
      if (validate.object(path, value, errors)) {
        _.forEach(value, (conditionValue, conditionKey) => {
          if(!_.some(conditionKeys, (k) => conditionKey.match(k))) {
            const keys = _.map(conditionKeys, (c) => String(c).replace(/[^A-Za-z:]/g, ''));
            const message = withSuggestion(
              `key must be one of ${keys.join(', ')}, got ${conditionKey}`,
              keys,
              conditionKey
            );
            errors.push({
              path: path.concat(conditionKey),
              message: message
            });
            validate.or(validate.string, listOf(validate.string))(
              path.concat(conditionKey),
              conditionValue,
              errors
            );
          }
        });
      }
    });
    return true;
  } else {
    return false;
  }
}

const validateStatement = (path: Path, value: any, errors: Error[]): boolean => {
  const spec = {
    Sid: [validate.optional, validate.string],
    Effect: [validate.required, stringOf(['Allow', 'Deny'])],
    // Principal can not be specified for inline policies
    Principal: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    Action: [validate.required, validate.or(validate.string, listOf(validate.string))],
    Resource: [validate.optional, validate.or(validate.string, listOf(validate.string))],
    Condition: [validate.optional, validateCondition],
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
