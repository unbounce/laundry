import * as _ from 'lodash';
import * as validate from '../validate';
import {Validator} from '../validate';
import {Path, Error} from '../types';

// Based on https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html

const required = {
  Type: (path: Path, type: any, errors: Error[]) => {
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
    if(validate.required(path, type, errors) && !_.includes(types, type)) {
      errors.push({
        path,
        message: `must be one of String, Number, List<Number>, CommaDelimitedList or one of those defined in ${docs}`
      });
    }
  }
};

const optional = {
  AllowedPattern: (path: Path, parameter: object, allowedPattern: any, errors: Error[]) => {
    if(validate.string(path, allowedPattern, errors)) {
      if(_.get(parameter, 'Type') !== 'String') {
        errors.push({path, message: 'can only be specified with Type String'});
      }
    }
  },
  AllowedValues: (path: Path, parameter: object, allowedValues: any, errors: Error[]) => {
    validate.list(path, allowedValues, errors);
    const type = _.get(parameter, 'Type');
    if(_.isArray(allowedValues) && type) {
      _.forEach(allowedValues, (allowedValue, i) => {
        if(type === 'Number') {
          if(!_.isNumber(_.parseInt(allowedValue))) {
            errors.push({ path: path.concat(i.toString()), message: 'does not match Type Number' });
          }
        } else {
          validate.string(path.concat(i.toString()), allowedValue, errors);
        }
      });
    }
  },
  ConstraintDescription: (path: Path, parameter: object, allowedValues: any, errors: Error[]) => {
    validate.string(path, allowedValues, errors);
  },
  Default: (path: Path, parameter: object, value: any, errors: Error[]) => {
    validate.optional(path, value, errors);
    const type = _.get(parameter, 'Type')
    if(type === 'Number') {
      if(!validate.number(path, value, [])){
        errors.push({ path, message: 'does not match Type Number' });
      }
    } else if(type) {
      validate.string(path, value, errors);
    }

    const maxLength = _.parseInt(_.get(parameter, 'MaxLength'));
    if(maxLength) {
      if(type === 'String' && _.isString(value) && value.length > maxLength) {
        errors.push({ path, message: 'length must be less than MaxLength' });
      }
    }

    const minLength = _.parseInt(_.get(parameter, 'MinLength'));
    if(minLength) {
      if(type === 'String' && _.isString(value) && value.length < minLength) {
        errors.push({ path, message: 'length must be less than MinLength' });
      }
    }

    const maxValue = _.parseInt(_.get(parameter, 'MaxValue'));
    const num = _.parseInt(value);
    if(maxValue) {
      if(type === 'Number' && num && num > maxValue) {
        errors.push({ path, message: 'must be less than MaxValue' });
      }
    }

    const allowedValues = _.get(parameter, 'AllowedValues');
    if(allowedValues && _.isArray(allowedValues) && !_.includes(allowedValues, value)) {
      errors.push({ path, message: 'must match AllowedValues' });
    }

    const allowedPattern = _.get(parameter, 'AllowedPattern');
    const regex = new RegExp(allowedPattern);
    if(allowedPattern && !regex.exec(value)) {
      errors.push({ path, message: 'must match AllowedPattern' });
    }
  },
  Description: (path: Path, parameter: object, description: any, errors: Error[]) => {
    if(validate.string(path, description, errors)) {
      if(description.length > 4000) {
        errors.push({path, message: 'must be less than 4000 characters'});
      }
    }
  },
  MinLength: (path: Path, parameter: object, minLength: any, errors: Error[]) => {
    validate.number(path, minLength, errors);
    const type = _.get(parameter, 'Type')
    if(type !== 'String') {
      errors.push({path, message: 'can only be specified with Type String'});
    }
  },
  MaxLength: (path: Path, parameter: object, maxLength: any, errors: Error[]) => {
    validate.number(path, maxLength, errors);
    const type = _.get(parameter, 'Type')
    if(type !== 'String') {
      errors.push({path, message: 'can only be specified with Type String'});
    }
  },
  MaxValue: (path: Path, parameter: object, maxLength: any, errors: Error[]) => {
    validate.number(path, maxLength, errors);
    const type = _.get(parameter, 'Type')
    if(type !== 'Number') {
      errors.push({path, message: 'can only be specified with Type Number'});
    }
  },
  NoEcho: (path: Path, parameter: object, noEcho: any, errors: Error[]) => {
    validate.boolean(path, noEcho, errors);
  },
};

export default class ParametersValidator extends Validator {

  Parameters(path: Path, parameters: any) {
    if(validate.optional(path, parameters, this.errors)
       && validate.object(path, parameters, this.errors)) {
      this.forEachWithPath(path, parameters, (path, parameter, name) => {
        if(validate.object(path, parameter, this.errors)) {
          _.forEach(parameter, (value, key) => {
            const s = _.get(optional, key);
            if(s) {
              s(path.concat(key), parameter, value, this.errors);
            } else if(!_.includes(_.keys(required), key)) {
              this.errors.push({ path: path.concat(key), message: 'invalid property'});
            }
          });
          _.forEach(required, (fn, key) => {
            fn(path.concat(key), _.get(parameter, key), this.errors);
          });
        }
      });
    }
  }

}
