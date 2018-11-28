import * as _ from 'lodash';

import {ParametersValidator} from './parameters';
import {RefsValidator} from './refs';
import {TagsValidator} from './validators/tags';
import {Path, Error, ResourceSpecificationError} from './types';
import {Visitor, Walker} from './ast';

import * as yaml from './yaml';
import * as validate from './validate';
import {Validator} from './validate';
import {
  PrimitiveType,
  Type,
  ResourceType,
  PropertyType,
  ResourceTypes,
  PropertyTypes
} from './spec';

class RootValidator extends Validator {
  Root(path: Path, root: any) {
    validate.object(path, root, this.errors);
  }

  Resources(path: Path, resources: any) {
    validate.required(path, resources, this.errors) && validate.object(path, resources, this.errors);
  }

  Description(path: Path, description: any) {
    validate.optional(description) && validate.string(path, description, this.errors);
  }

  AWSTemplateFormatVersion(path: Path, version: any) {
    if (_.isUndefined(version)) return;

    if(validate.string(path, version, this.errors)) {
      if(!version.match(/\d{4}-\d{2}-\d{2}/)) {
        this.errors.push({path, message: 'must be in the format 2010-09-09'});
      }
    }
  }

  Metadata(path: Path, metadata: any) {
    validate.optional(metadata) && validate.object(path, metadata, this.errors);
  }

  // Mappings(path: Path, mappings: any) {
  //   validate.optional(mappings) && validate.object(path, mappings, this.errors);
  // }

  // Conditions(path: Path, conditions: any) {
  //   validate.optional(conditions) && validate.object(path, conditions, this.errors);
  // }

  // Transform(path: Path, transform: any) {
  //   validate.optional(transform) && validate.object(path, transform, this.errors);
  // }

  // Outputs(path: Path, outputs: any) {
  //   validate.optional(outputs) && validate.object(path, outputs, this.errors);
  // }
}

class ResourceTypeValidator extends Validator {
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

class RequriedResourcePropertyValidator extends Validator {
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

class ResourcePropertyValidator extends Validator {
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

export function lint(template: string) {
  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ParametersValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors),
    new RefsValidator(errors),
    new TagsValidator(errors)
  ];
  const walker = new Walker(validators);
  walker.Root(yaml.load(template));
  return errors;
}
