import * as _ from 'lodash';

import { Visitor } from './ast';
import { Path } from './types';
import { PrimitiveType, PropertyValueType } from './spec';
import * as yaml from './yaml';

function parameterToPrimitiveTypes(parameter: object): PrimitiveType[] | undefined {
  switch (_.get(parameter, 'Type')) {
    case 'String':
    case 'AWS::SSM::Parameter::Name':
    case 'AWS::SSM::Parameter::Value<String>':
    case 'AWS::EC2::AvailabilityZone::Name':
    case 'AWS::EC2::Image::Id':
    case 'AWS::EC2::Instance::Id':
    case 'AWS::EC2::KeyPair::KeyName':
    case 'AWS::EC2::SecurityGroup::GroupName':
    case 'AWS::EC2::SecurityGroup::Id':
    case 'AWS::EC2::Subnet::Id':
    case 'AWS::EC2::Volume::Id':
    case 'AWS::EC2::VPC::Id':
    case 'AWS::Route53::HostedZone::Id':
    case 'CommaDelimitedList':
    case 'AWS::SSM::Parameter::Value<CommaDelimitedList>':
      // Try to infer other types from Default value
      const defaultValue = _.get(parameter, 'Default');
      if (_.isString(defaultValue)) {
        const types = ['String'];
        if (defaultValue.match(/^(true|false)$/i)) {
          types.push('Boolean');
        }
        if (_.isFinite(_.parseInt(defaultValue))) {
          types.push('Number');
        }
        return types;
      } else {
        // Without any other information, we can't tell if a String parameter will
        // be rejected for properties that accept a Number or Boolean, so we must
        // assume that this parameter is valid for those properties.
        return ['String', 'Number', 'Boolean'];
      }
    case 'Number':
      // A `Number` parameter may be valid for a `String` property
      return ['Number', 'String'];
    default:
      return undefined;
  }
}

export default class CfnFnPreparer extends Visitor {
  parameterTypes: { [key: string]: PropertyValueType[] } = {};

  Parameters(path: Path, o: any) {
    if (_.isObject(o)) {
      _.forEach(o, (parameter, name) => {
        let type = _.get(parameter, 'Type');

        if (_.isString(type)) {
          let isList = false;
          // Extract basic type out of List or Parameter

          if (_.includes(type, 'CommaDelimitedList')) {
            isList = true;
          } else {
            _.find(
              [/List<(.+)>/,
                /AWS::SSM::Parameter::Value<List<(.+)>>/,
                /AWS::SSM::Parameter::Value<(.+)>/],
              (re) => {
                const match = type.match(re);
                if (match) {
                  isList = true;
                  type = match[1];
                  return true;
                } else {
                  return false;
                }
              });
          }
          const primitiveTypes = parameterToPrimitiveTypes(parameter);
          this.parameterTypes[name] = _.reduce(primitiveTypes, (acc, primitiveType) => {
            let spec: PropertyValueType;
            if (isList) {
              spec = {
                Type: 'List',
                PrimitiveItemType: primitiveType
              };
            } else {
              spec = {
                PrimitiveType: primitiveType
              };
            }
            acc.push(spec);
            return acc;
          }, [] as PropertyValueType[]);
        }
      });
    }
  }

  CfnFn(path: Path, cfnFn: yaml.CfnFn) {
    // Update Ref returnSpec based on parameter Type
    if (cfnFn instanceof yaml.Ref) {
      const parameterType = _.get(this.parameterTypes, cfnFn.data);
      if (parameterType) {
        cfnFn.returnSpec = parameterType;
      }
    }
  }
}
