import * as _ from 'lodash';

import * as validate from '../validate';
import {Validator} from '../validate';
import {Path, Error} from '../types';
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
     if(_.isObject(resource)) {
       if(validate.required(path, resource.Type, this.errors)) {
        const s: ResourceType = _.get(ResourceTypes, resource.Type);
         if(!s) {
          this.errors.push({
            path: path.concat('Type'),
            message: `invalid type ${resource.Type}`
          });
        }
      }
    }
  }
}

export class RequriedResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
     if(_.isObject(resource)) {
      const s: ResourceType = _.get(ResourceTypes, resource.Type);
       if(s) {
        _.forEach(s.Properties, (property, name) => {
           if(property.Required) {
             validate.required(path.concat(name), resource[name], this.errors);
          }
        });
      }
    }
  }
}

export class ResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
    if(_.isObject(resource)) {
      const resourceType: ResourceType = _.get(ResourceTypes, resource.Type);
      if(resourceType) {
        if(_.isObject(resource.Properties)) {
          this.forEachWithPath(path.concat('Properties'), resource.Properties, (path, property, name) => {
            const propertyType = resourceType.Properties[name];
            if(propertyType) {
              validate.spec(path, propertyType, property, this.errors);
            } else {
              this.errors.push({path, message: 'invalid property'});
            }
          });
        }
      }
    }
  }
}
