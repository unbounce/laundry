import * as _ from 'lodash';

import * as validate from '../validate';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import {
  PrimitiveType,
  Type,
  ResourceType,
  PropertyType,
  ResourceTypes,
  PropertyTypes
} from '../spec';

export class ResourceTypeValidator extends Validator {
  Resource(path: Path, resource: any) {
    if (_.isObject(resource)) {
      const resourceType = _.get(resource, 'Type');
      if (validate.required(path, resourceType, this.errors)) {
        if (!_.startsWith(resourceType, 'Custom::')) {
          const s: ResourceType = _.get(ResourceTypes, resourceType);
          if (!s) {
            this.errors.push({
              path: path.concat('Type'),
              message: `invalid type ${resource.Type}`
            });
          }
        }
      }
    }
  }
}

export class RequriedResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
    if (_.isObject(resource)) {
      const s: ResourceType = _.get(ResourceTypes, resource.Type);
      if (s) {
        _.forEach(s.Properties, (property, name) => {
          if (property.Required) {
            validate.required(path.concat(['Properties', name]), _.get(resource, ['Properties', name]), this.errors);
          }
        });
      }
    }
  }
}

export class ResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
    if (_.isObject(resource)) {
      const resourceType: ResourceType = _.get(ResourceTypes, resource.Type);
      if (resourceType) {
        if (_.isObject(resource.Properties)) {
          this.forEachWithPath(path.concat('Properties'), resource.Properties, (path, property, name) => {
            const propertyType = resourceType.Properties[name];
            if (propertyType) {
              validate.spec(path, resource.Type, propertyType, property, this.errors);
            } else {
              this.errors.push({ path, message: 'invalid property' });
            }
          });
        }
      }
    }
  }
}

export class ResourceConditionValidator extends Validator {

  conditions: string[] = [];

  Conditions(path: Path, conditions: any) {
    if (_.isObject(conditions)) {
      _.forEach(conditions, (condition, name) => {
        this.conditions.push(name);
      });
    }
  }

  Resource(path: Path, resource: any) {
    if (_.isObject(resource)) {
      const condition = _.get(resource, 'Condition');
      path = path.concat('Condition');
      if (validate.optional(path, condition, this.errors)
        && validate.string(path, condition, this.errors)) {
        if (!_.includes(this.conditions, condition)) {
          this.errors.push({
            path,
            message: `${condition} is not a valid Condition`
          });
        }
      }
    }
  }
}
