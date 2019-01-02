import * as _ from 'lodash';

import { Visitor } from './ast';
import { Path } from './types';
import { PrimitiveType, PropertyValueType, ResourceTypes, Attributes } from './spec';
import { valueToSpecs, isStringBoolean, isStringNumber, subVariables } from './util';
import * as yaml from './yaml';

function parameterToPrimitiveTypes(
  name: string,
  parameter: object,
  type: string,
  parameters: object): PrimitiveType[] {
  switch (type) {
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
      return ['String'];
    case 'String':
      const defaultSpecs = ['String', 'Number', 'Boolean'];
      // Try to infer other types from Default value
      const value = _.get(parameters, name);
      const defaultValue = _.get(parameter, 'Default');
      if (value) {
        const valueSpecs = valueToSpecs(value);
        if (valueSpecs) {
          return _.reduce(valueSpecs, (acc, spec) => {
            if (spec.PrimitiveType) {
              acc.push(spec.PrimitiveType);
            }
            return acc;
          }, [] as PrimitiveType[]);
        }
      } else if (_.isString(defaultValue)) {
        const types = ['String'];
        if (isStringBoolean(defaultValue)) {
          types.push('Boolean');
        }
        if (isStringNumber(defaultValue)) {
          types.push('Number');
        }
        return types;
      } else {
        // Without any other information, we can't tell if a String parameter will
        // be rejected for properties that accept a Number or Boolean, so we must
        // assume that this parameter is valid for those properties.
        return defaultSpecs;
      }
    case 'Number':
      // A `Number` parameter may be valid for a `String` property
      return ['Number', 'String'];
    default:
      if (type.match(/AWS::SSM::Parameter::Value<[^<]+>/)) {
        return ['String', 'Number', 'Boolean'];
      } else {
        return [];
      }
  }
}

export default class CfnFnPreparer extends Visitor {
  private parameterTypes: { [key: string]: PropertyValueType[] } = {};
  private parameters: object;
  private resources: { [name: string]: string[] } = {}
  private mappings: {
    [key1: string]: {
      [key2: string]: {
        [key3: string]: PropertyValueType[]
      }
    }
  } = {};

  constructor(p: object) {
    super();
    this.parameters = p;
  }

  Resources(path: Path, resources: any) {
    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        const type = _.get(resource, 'Type');
        this.resources[name] = _.get(ResourceTypes, [type, 'Attributes'], {});
      });
    }
  }

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
            _.find([
              /AWS::SSM::Parameter::Value<List<(.+)>>/, // AWS::SSM::Parameter::Value<List<AWS::EC2::AvailabilityZone::Name>>
              /List<(.+)>/,
            ], (re) => {
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
          const primitiveTypes = parameterToPrimitiveTypes(name, parameter, type, this.parameters);
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

  Mappings(path: Path, o: any) {
    if (_.isObject(o)) {
      _.forEach(o, (o1, k1) => {
        if (_.isObject(o1)) {
          _.forEach(o1, (o2, k2) => {
            if (_.isObject(o2)) {
              _.forEach(o2, (o3, k3) => {
                // Yay, we're here
                const specs = valueToSpecs(o3);
                if (specs && !_.isEmpty(specs)) {
                  _.set(this.mappings, [k1, k2, k3], specs);
                }
              });
            }
          });
        }
      });
    }
  }

  CfnFn(path: Path, propertyName: string, cfnFn: yaml.CfnFn) {
    if (cfnFn instanceof yaml.Ref) {
      // Update Ref returnSpec based on parameter Type
      const parameterType = _.get(this.parameterTypes, cfnFn.data);
      if (parameterType) {
        cfnFn.returnSpec = parameterType;
      }
    } else if (cfnFn instanceof yaml.Sub) {
      const variables = subVariables(cfnFn);
      // If there is only one variable in the Sub , and it contains no other
      // non-whitespace characters, it is effectively a Ref, so
      // treat it the same
      const variable = variables[0];
      if (variables.length === 1 && _.trim(cfnFn.data) === `\${${variable}}`) {
        const parameterType = _.get(this.parameterTypes, variable);
        if (parameterType) {
          cfnFn.returnSpec = parameterType;
        }
      }
    } else if (cfnFn instanceof yaml.GetAtt) {
      let resource, parts;
      if (cfnFn.isYamlTag() && _.isString(cfnFn.data)) {
        // !GetAtt A.Att
        // !GetAtt A.Att.Nested
        [resource, ...parts] = cfnFn.data.split('.');
      } else if (_.isArray(cfnFn.data) && cfnFn.data.length > 1 && _.isString(cfnFn.data[0])) {
        // !GetAtt [A, Att]
        // !GetAtt [A, Att.Nested]
        resource = cfnFn.data[0];
        parts = cfnFn.data[1].split('.');
      } else {
        return;
      }

      // Some resources, like `AWS::ElasticLoadBalancing::LoadBalancer` have
      // Attributes with a dot in them, like `SourceSecurityGroup.GroupName`
      const fullAttribute = parts.join('.');
      if (_.has(this.resources, [resource, fullAttribute])) {
        cfnFn.returnSpec = [_.get(this.resources, [resource, fullAttribute])];
      }

      const attribute = parts[0];
      if (_.has(this.resources, [resource, attribute])) {
        const spec = _.get(this.resources, [resource, attribute]);
        if (_.isEqual(spec, { PrimitiveType: 'Json'}) && parts.length > 1) {
          // If this is a nested lookup of a JSON type, assume it is a String
          cfnFn.returnSpec = [{ PrimitiveType: 'String' }];
        } else {
          cfnFn.returnSpec = [spec];
        }
      }
    } else if (cfnFn instanceof yaml.FindInMap) {
      if (_.isArray(cfnFn.data) && cfnFn.data.length === 3) {
        const specs = _.reduce(filterMappings(cfnFn.data[0], this.mappings), (acc1, m1) => {
          return _.reduce(filterMappings(cfnFn.data[1], m1), (acc2, m2) => {
            const mappings = filterMappings(cfnFn.data[2], m2);
            return _.concat(acc2, _.flatten(_.values(mappings)));
          }, acc1);
        }, []);
        if (!_.isEmpty(specs)) {
          cfnFn.returnSpec = _.uniqWith(specs, _.isEqual);
        }
      }
    }
  }
}

function filterMappings(key: string | yaml.CfnFn, o: object) {
  return _.pickBy(o, (v, k) => {
    // If any segment of the `FindInMap` path is a dynamic value, accept all
    // values at that level
    if (key instanceof yaml.CfnFn) {
      return true;
    } else {
      return key == k;
    }
  })
}
