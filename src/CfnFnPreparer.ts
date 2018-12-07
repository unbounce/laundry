import * as _ from 'lodash';

import { Visitor } from './ast';
import { Path } from './types';
import { PrimitiveType, PropertyValueType } from './spec';
import * as yaml from './yaml';

function parameterTypeToPrimitiveType(type: string): PrimitiveType | undefined {
  switch (type) {
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
      return 'String';
    case 'Number':
      return 'Number';
    case 'CommaDelimitedList':
    case 'AWS::SSM::Parameter::Value<CommaDelimitedList>':
    default:
      return undefined;
  }
}

export default class CfnFnPreparer extends Visitor {
  parameterTypes: { [key: string]: PropertyValueType } = {};

  Parameters(path: Path, o: any) {
    if (_.isObject(o)) {
      _.forEach(o, (parameter, name) => {
        let type = _.get(parameter, 'Type');

        if (_.isString(type)) {
          let isList = false;
          // Extract basic type out of List or Parameter
          let match = type.match(/List<(.+)>/);
          if (match) {
            isList = true;
            type = match[1];
          } else {
            match = type.match(/AWS::SSM::Parameter::Value<List<(.+)>>/);
            if (match) {
              isList = true;
              type = match[1];
            } else {
              match = type.match(/AWS::SSM::Parameter::Value<(.+)>/);
              if (match) {
                type = match[1];
              }
            }
          }
          const primitiveType = parameterTypeToPrimitiveType(type);
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
          this.parameterTypes[name] = spec;
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
