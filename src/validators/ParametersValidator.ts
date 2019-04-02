import * as _ from 'lodash';
import * as validate from '../validate';
import { Validator } from '../validate';
import { Path, ErrorFn } from '../types';
import { withSuggestion } from '../util';

// Based on https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html

const required = {
  Type: (path: Path, type: any, error: ErrorFn) => {
    const docs = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-specific-parameter-types';
    const awsTypes = [
      'AWS::EC2::AvailabilityZone::Name',
      'AWS::EC2::Image::Id',
      'AWS::EC2::Instance::Id',
      'AWS::EC2::KeyPair::KeyName',
      'AWS::EC2::SecurityGroup::GroupName',
      'AWS::EC2::SecurityGroup::Id',
      'AWS::EC2::Subnet::Id',
      'AWS::EC2::Volume::Id',
      'AWS::EC2::VPC::Id',
      'AWS::Route53::HostedZone::Id',
    ];
    const types = _.concat(
      [
        'String',
        'Number',
        'List<Number>',
        'CommaDelimitedList',
        'AWS::SSM::Parameter::Name',
        'AWS::SSM::Parameter::Value<String>',
        'AWS::SSM::Parameter::Value<List<String>>',
        'AWS::SSM::Parameter::Value<CommaDelimitedList>'
      ],
      awsTypes,
      _.map(awsTypes, (t) => `List<${t}>`),
      _.map(awsTypes, (t) => `AWS::SSM::Parameter::Value<${t}>`),
      _.map(awsTypes, (t) => `AWS::SSM::Parameter::Value<List<${t}>>`),
    );
    if (validate.required(path, type, error) && !_.includes(types, type)) {
      const message = `must be one of String, Number, List<Number>, CommaDelimitedList or one of those defined in ${docs}`;
      error(path, message);
    }
  }
};

const optional = {
  AllowedPattern: (path: Path, parameter: object, allowedPattern: any, addError: ErrorFn) => {
    if (validate.string(path, allowedPattern, addError)) {
      if (_.get(parameter, 'Type') !== 'String') {
        addError(path, 'can only be specified with Type String');
      }
    }
  },
  AllowedValues: (path: Path, parameter: object, allowedValues: any, addError: ErrorFn) => {
    validate.list(path, allowedValues, addError);
    const type = _.get(parameter, 'Type');
    if (_.isArray(allowedValues) && type) {
      _.forEach(allowedValues, (allowedValue, i) => {
        if (type === 'Number') {
          if (!_.isNumber(_.parseInt(allowedValue))) {
            addError(path.concat(i.toString()), 'does not match Type Number');
          }
        } else {
          validate.string(path.concat(i.toString()), allowedValue, addError);
        }
      });
    }
  },
  ConstraintDescription: (path: Path, parameter: object, allowedValues: any, addError: ErrorFn) => {
    validate.string(path, allowedValues, addError);
  },
  Default: (path: Path, parameter: object, value: any, addError: ErrorFn) => {
    validate.optional(path, value, addError);
    const type = _.get(parameter, 'Type')
    if (type === 'Number') {
      if (!validate.number(path, value, () => {})) {
        addError(path, 'does not match Type Number');
      }
    } else if (type) {
      validate.string(path, value, addError);
    }

    const maxLength = _.parseInt(_.get(parameter, 'MaxLength'));
    if (maxLength) {
      if (type === 'String' && _.isString(value) && value.length > maxLength) {
        addError(path, 'length must be less than MaxLength');
      }
    }

    const minLength = _.parseInt(_.get(parameter, 'MinLength'));
    if (minLength) {
      if (type === 'String' && _.isString(value) && value.length < minLength) {
        addError(path, 'length must be less than MinLength');
      }
    }

    const maxValue = _.parseInt(_.get(parameter, 'MaxValue'));
    const num = _.parseInt(value);
    if (maxValue) {
      if (type === 'Number' && num && num > maxValue) {
        addError(path, 'must be less than MaxValue');
      }
    }

    const allowedValues = _.get(parameter, 'AllowedValues');
    if (allowedValues && _.isArray(allowedValues) && !_.includes(allowedValues, value)) {
      addError(path, 'must match AllowedValues');
    }

    const allowedPattern = _.get(parameter, 'AllowedPattern');
    const regex = new RegExp(allowedPattern);
    if (allowedPattern && !regex.exec(value)) {
      addError(path, 'must match AllowedPattern');
    }
  },
  Description: (path: Path, parameter: object, description: any, addError: ErrorFn) => {
    if (validate.string(path, description, addError)) {
      if (description.length > 4000) {
        addError(path, 'must be less than 4000 characters');
      }
    }
  },
  MinLength: (path: Path, parameter: object, minLength: any, addError: ErrorFn) => {
    validate.number(path, minLength, addError);
    const type = _.get(parameter, 'Type')
    if (type !== 'String') {
      addError(path, 'can only be specified with Type String');
    }
  },
  MaxLength: (path: Path, parameter: object, maxLength: any, addError: ErrorFn) => {
    validate.number(path, maxLength, addError);
    const type = _.get(parameter, 'Type')
    if (type !== 'String') {
      addError(path, 'can only be specified with Type String');
    }
  },
  MinValue: (path: Path, parameter: object, minLength: any, addError: ErrorFn) => {
    validate.number(path, minLength, addError);
    const type = _.get(parameter, 'Type')
    if (type !== 'Number') {
      addError(path, 'can only be specified with Type Number');
    }
  },
  MaxValue: (path: Path, parameter: object, maxLength: any, addError: ErrorFn) => {
    validate.number(path, maxLength, addError);
    const type = _.get(parameter, 'Type')
    if (type !== 'Number') {
      addError(path, 'can only be specified with Type Number');
    }
  },
  NoEcho: (path: Path, parameter: object, noEcho: any, addError: ErrorFn) => {
    validate.boolean(path, noEcho, addError);
  },
};

export default class ParametersValidator extends Validator {

  Parameters(path: Path, parameters: any) {
    if (validate.optional(path, parameters, this.addError)
      && validate.object(path, parameters, this.addError)) {
      this.forEachWithPath(path, parameters, (path, parameter, name) => {
        if (validate.object(path, parameter, this.addError)) {
          _.forEach(parameter, (value, key) => {
            const s = _.get(optional, key);
            if (s) {
              s(path.concat(key), parameter, value, this.addError);
            } else if (!_.includes(_.keys(required), key)) {
              const validKeys = _.concat(_.keys(optional), _.keys(required));
              const message = withSuggestion('invalid property', validKeys, key);
              this.addError(path.concat(key), message);
            }
          });
          _.forEach(required, (fn, key) => {
            fn(path.concat(key), _.get(parameter, key), this.addError);
          });
        }
      });
    }
  }

}
