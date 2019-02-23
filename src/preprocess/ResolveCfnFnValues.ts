import * as _ from 'lodash';

import { Visitor } from '../ast';
import { Path } from '../types';
import { PrimitiveType, PropertyValueType, ResourceTypes, Attributes } from '../spec';
import { valueToSpecs, isStringBoolean, isStringNumber, subVariables } from '../util';
import * as yaml from '../yaml';

export default class ResovleCfnFnValues extends Visitor {
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

  private refValue(ref: string) {
    if (_.has(this.parameters, ref)) {
      return _.get(this.parameters, ref);
    }
  }

  CfnFn(path: Path, propertyName: string, cfnFn: yaml.CfnFn) {
    if (cfnFn instanceof yaml.Ref) {
      cfnFn = this.refValue(cfnFn.data);
    } else if (cfnFn instanceof yaml.Sub) {
      const variables = subVariables(cfnFn);
      let resolvedValue = cfnFn.data;
      for (const variable of variables) {
        const value = this.refValue(variable);
        if (!_.isUndefined(value)) {
          const r = new RegExp(`\\$\\{\\s*${variable}\\s*\\}`, 'g');
          resolvedValue = resolvedValue.replace(r, value);
        }
      }
      cfnFn.resolvedValue = resolvedValue;
    } else if (cfnFn instanceof yaml.FindInMap) {
      if (_.isArray(cfnFn.data) && cfnFn.data.length === 3) {
        // cfnFn.resolvedValue = ;
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
  });
}
