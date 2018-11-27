import * as _ from 'lodash';
import * as validate from './validate';
import {Validator} from './validate';
import {Path, Error} from './types';

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
  AllowedPattern: (path: Path, allowedPattern: any, errors: Error[]) => {
    if(validate.string(path, allowedPattern, errors)) {
      // if(_.get(parameters, 'Type') !== 'String') {
      //   errors.push({path, message: 'can only be used with Type: String'});
      // }
    }
  },
  AllowedValues: (path: Path, allowedValues: any, errors: Error[]) => validate.list(path, allowedValues, errors),
  ConstraintDescription: (path: Path, allowedValues: any, errors: Error[]) => validate.list(path, allowedValues, errors),
  Default: (value: any) => {
    validate.optional(value);
    // TODO apply constraints to default
  },
  Description: (path: Path, description: any, errors: Error[]) => {
    if(validate.string(path, description, errors)) {
      if(description.length > 4000) {
        errors.push({path, message: 'must be less than 4000 characters'});
      }
    }
  },
  MaxLength: (path: Path, maxLength: any, errors: Error[]) => validate.number(path, maxLength, errors),
  MaxValue: (path: Path, maxLength: any, errors: Error[]) => validate.number(path, maxLength, errors),
  NoEcho: (path: Path, noEcho: any, errors: Error[]) => validate.boolean(path, noEcho, errors),
};

export class ParametersValidator extends Validator {

  Parameters(path: Path, parameters: any) {
    if(validate.optional(parameters) && validate.object(path, parameters, this.errors)) {
      this.forEachWithPath(path, parameters, (path, parameter, name) => {
        if(validate.object(path, parameter, this.errors)) {
          _.forEach(parameter, (value, key) => {
            const s = _.get(optional, name);
            if(s) {
              s(path.concat(key), value, this.errors);
            } if(!_.includes(_.keys(required), key)) {
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
